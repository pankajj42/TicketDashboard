import { PrismaClient } from "../generated/prisma/client.js";
import { JwtService } from "./jwt.service.js";
import crypto from "crypto";
import type { ApiDeviceInfo } from "@repo/shared";

const prisma = new PrismaClient();

export interface CreateSessionOptions {
	userId: string;
	userAgent: string;
	ipAddress: string;
	deviceName?: string;
	deviceFingerprint?: string; // Client-provided fingerprint (future)
}

export interface SessionData {
	accessToken: string;
	refreshToken: string;
	sessionId: string;
	expiresAt: Date;
}

export class SessionService {
	// Create new session with refresh token
	static async createSession(
		options: CreateSessionOptions
	): Promise<SessionData> {
		const sessionId = crypto.randomUUID();

		// Use client fingerprint if provided, otherwise generate server-side
		const deviceId =
			options.deviceFingerprint ||
			this.generateConsistentDeviceId(
				options.userAgent,
				options.ipAddress
			);

		const accessToken = JwtService.generateAccessToken({
			userId: options.userId,
			sessionId,
		});

		const refreshTokenPayload = {
			userId: options.userId,
			sessionId,
			deviceId,
		};

		const refreshToken =
			JwtService.generateRefreshToken(refreshTokenPayload);

		// Store refresh token in database
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		await prisma.refreshToken.create({
			data: {
				token: refreshToken,
				userId: options.userId,
				sessionId,
				deviceName:
					options.deviceName ||
					this.parseDeviceName(options.userAgent),
				userAgent: options.userAgent,
				ipAddress: options.ipAddress,
				expiresAt,
			},
		});

		return {
			accessToken,
			refreshToken,
			sessionId,
			expiresAt,
		};
	}

	// Refresh access token using refresh token
	static async refreshSession(
		refreshToken: string
	): Promise<{ accessToken: string } | null> {
		try {
			// Verify refresh token
			const payload = JwtService.verifyRefreshToken(refreshToken);

			// Check if refresh token exists in database
			const storedToken = await prisma.refreshToken.findUnique({
				where: { token: refreshToken },
				include: { user: true },
			});

			if (!storedToken || storedToken.expiresAt < new Date()) {
				return null;
			}

			// Update last used timestamp
			await prisma.refreshToken.update({
				where: { token: refreshToken },
				data: { lastUsed: new Date() },
			});

			// Generate new access token
			const accessToken = JwtService.generateAccessToken({
				userId: storedToken.user.id,
				sessionId: storedToken.sessionId,
			});

			return { accessToken };
		} catch (error) {
			console.error("Error refreshing session:", error);
			return null;
		}
	}

	// Logout from current device
	static async logoutSession(refreshToken: string): Promise<boolean> {
		try {
			const result = await prisma.refreshToken.delete({
				where: { token: refreshToken },
			});
			return !!result;
		} catch (error) {
			console.error("Error logging out session:", error);
			return false;
		}
	}

	// Logout from all devices
	static async logoutAllSessions(userId: string): Promise<number> {
		try {
			const result = await prisma.refreshToken.deleteMany({
				where: { userId },
			});
			return result.count;
		} catch (error) {
			console.error("Error logging out all sessions:", error);
			return 0;
		}
	}

	// Logout from specific device
	static async logoutDevice(
		userId: string,
		sessionId: string
	): Promise<boolean> {
		try {
			const result = await prisma.refreshToken.deleteMany({
				where: {
					userId,
					sessionId,
				},
			});
			return result.count > 0;
		} catch (error) {
			console.error("Error logging out device:", error);
			return false;
		}
	}

	// Get all active sessions for user
	static async getUserDevices(userId: string): Promise<ApiDeviceInfo[]> {
		const refreshTokens = await prisma.refreshToken.findMany({
			where: {
				userId,
				expiresAt: { gt: new Date() }, // Only active sessions
			},
			orderBy: { lastUsed: "desc" },
		});

		return refreshTokens.map((token) => ({
			id: token.sessionId,
			deviceName: token.deviceName || "Unknown Device",
			userAgent: token.userAgent,
			ipAddress: token.ipAddress,
			lastUsed: token.lastUsed,
			createdAt: token.createdAt,
		}));
	}

	// Validate session by access token
	static async validateSession(accessToken: string): Promise<any | null> {
		try {
			const payload = JwtService.verifyAccessToken(accessToken);

			// Verify session still exists
			const sessionExists = await prisma.refreshToken.findFirst({
				where: {
					sessionId: payload.sessionId,
					userId: payload.userId,
					expiresAt: { gt: new Date() },
				},
			});

			if (!sessionExists) {
				return null;
			}

			return payload;
		} catch (error) {
			console.error("Error validating session:", error);
			return null;
		}
	}

	// Clean up expired refresh tokens
	static async cleanupExpiredSessions(): Promise<number> {
		try {
			const result = await prisma.refreshToken.deleteMany({
				where: {
					expiresAt: { lt: new Date() },
				},
			});
			return result.count;
		} catch (error) {
			console.error("Error cleaning up expired sessions:", error);
			return 0;
		}
	}

	// Helper: Parse device name from user agent
	private static parseDeviceName(userAgent: string): string {
		// Simple device detection
		if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
			if (userAgent.includes("Chrome")) return "Mobile Chrome";
			if (userAgent.includes("Safari")) return "Mobile Safari";
			return "Mobile Device";
		}

		if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
			return "Tablet";
		}

		if (userAgent.includes("Chrome")) return "Chrome Browser";
		if (userAgent.includes("Firefox")) return "Firefox Browser";
		if (userAgent.includes("Safari")) return "Safari Browser";
		if (userAgent.includes("Edge")) return "Edge Browser";

		return "Desktop Browser";
	}

	// Helper: Generate consistent device ID from server-side data (fallback)
	private static generateConsistentDeviceId(
		userAgent: string,
		ipAddress: string
	): string {
		// Normalize user agent (remove version numbers that change frequently)
		const normalizedUA = userAgent
			.replace(/\d+\.\d+\.\d+/g, "X.X.X") // Replace version numbers
			.replace(/\s+/g, " ")
			.trim();

		const deviceData = {
			userAgent: normalizedUA,
			platform: this.extractPlatform(userAgent),
			browser: this.extractBrowser(userAgent),
			// Use IP subnet for some consistency while allowing for dynamic IPs
			ipSubnet: ipAddress.includes(":")
				? ipAddress.split(":")[0] // IPv6 - use first segment
				: ipAddress.split(".").slice(0, 3).join("."), // IPv4 - use /24 subnet
		};

		return crypto
			.createHash("sha256")
			.update(JSON.stringify(deviceData))
			.digest("hex")
			.substring(0, 16); // 16-character hex string
	}

	// Helper: Extract platform from user agent
	private static extractPlatform(userAgent: string): string {
		if (userAgent.includes("Windows")) return "Windows";
		if (userAgent.includes("Macintosh")) return "macOS";
		if (userAgent.includes("Linux")) return "Linux";
		if (userAgent.includes("Android")) return "Android";
		if (userAgent.includes("iPhone") || userAgent.includes("iPad"))
			return "iOS";
		return "Unknown";
	}

	// Helper: Extract browser from user agent
	private static extractBrowser(userAgent: string): string {
		if (userAgent.includes("Chrome")) return "Chrome";
		if (userAgent.includes("Firefox")) return "Firefox";
		if (userAgent.includes("Safari")) return "Safari";
		if (userAgent.includes("Edge")) return "Edge";
		return "Unknown";
	}
}
