import { Request, Response } from "express";
import { z } from "zod";
import { OtpService } from "../services/otp.service.js";
import { SessionService } from "../services/session.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import config from "../config/env.js";
import crypto from "crypto";
import type {
	LoginRequest,
	LoginResponse,
	VerifyOtpRequest,
	VerifyOtpResponse,
	RefreshTokenResponse,
	LogoutRequest,
	LogoutResponse,
	GetDevicesResponse,
	LogoutDeviceResponse,
	ApiErrorResponse,
} from "@repo/shared";
import {
	LoginSchema,
	VerifyOtpSchema,
	LogoutSchema,
	LogoutDeviceSchema,
} from "@repo/shared";

export class AuthController {
	// POST /api/auth/login - Send OTP to email
	static async login(
		req: Request<{}, {}, LoginRequest>,
		res: Response<LoginResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const { email } = LoginSchema.parse(req.body);

			const result = await OtpService.generateAndSendOtp(email);

			if (!result.success) {
				res.status(400).json({
					error: result.message,
					code: "OTP_GENERATION_FAILED",
				});
				return;
			}

			res.json({
				message: "OTP sent to your email",
				otpSent: true,
			});
		} catch (error) {
			console.error("Login error:", error);

			if (error instanceof z.ZodError) {
				res.status(400).json({
					error: "Invalid request data",
					code: "VALIDATION_ERROR",
					details: error.issues,
				});
				return;
			}

			res.status(500).json({
				error: "Failed to send OTP",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// POST /api/auth/verify-otp - Verify OTP and create session
	static async verifyOtp(
		req: Request<{}, {}, VerifyOtpRequest>,
		res: Response<VerifyOtpResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const { email, otp, deviceInfo } = VerifyOtpSchema.parse(req.body);
			const ipAddress = req.ip || "unknown";

			// Verify OTP
			const otpResult = await OtpService.verifyOtp(email, otp);

			if (!otpResult.success) {
				res.status(400).json({
					error: otpResult.message || "Invalid OTP",
					code: "INVALID_OTP",
				});
				return;
			}

			// Get or create user (moved from OTP service)
			let user = await UserRepository.findByEmail(email);
			let isNewUser = false;

			if (!user) {
				isNewUser = true;
				const username =
					AuthController.generateUsernameFromEmail(email);
				user = await UserRepository.create(email, username);
			} else {
				// Update last login
				await UserRepository.updateLastLogin(user.id);
			}

			// Create session
			const sessionData = await SessionService.createSession({
				userId: user.id,
				userAgent: deviceInfo.userAgent,
				ipAddress,
				deviceName: deviceInfo.deviceName,
			});

			// Set refresh token as httpOnly cookie
			res.cookie("refreshToken", sessionData.refreshToken, {
				httpOnly: true,
				secure: !config.isDevelopment, // Use secure in production
				sameSite: "strict",
				maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
				path: "/",
			});

			res.json({
				success: true,
				user: {
					id: user.id,
					email: user.email,
					username: user.username,
				},
				accessToken: sessionData.accessToken,
				isNewUser,
			});
		} catch (error) {
			console.error("Verify OTP error:", error);

			if (error instanceof z.ZodError) {
				res.status(400).json({
					error: "Invalid request data",
					code: "VALIDATION_ERROR",
					details: error.issues,
				});
				return;
			}

			res.status(500).json({
				error: "Failed to verify OTP",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// POST /api/auth/refresh - Refresh access token using refresh token cookie
	static async refreshToken(
		req: Request,
		res: Response<RefreshTokenResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const refreshToken = req.cookies?.refreshToken;

			if (!refreshToken) {
				res.status(401).json({
					error: "Refresh token required",
					code: "MISSING_REFRESH_TOKEN",
				});
				return;
			}

			const result = await SessionService.refreshSession(refreshToken);

			if (!result) {
				// Clear invalid refresh token cookie
				res.clearCookie("refreshToken");
				res.status(401).json({
					error: "Invalid or expired refresh token",
					code: "INVALID_REFRESH_TOKEN",
				});
				return;
			}

			res.json({
				accessToken: result.accessToken,
			});
		} catch (error) {
			console.error("Refresh token error:", error);
			res.status(500).json({
				error: "Failed to refresh token",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// POST /api/auth/logout - Logout from current device or all devices
	static async logout(
		req: Request<{}, {}, LogoutRequest>,
		res: Response<LogoutResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const { logoutAll } = LogoutSchema.parse(req.body);
			const refreshToken = req.cookies?.refreshToken;

			if (!refreshToken) {
				res.status(401).json({
					error: "No active session found",
					code: "NO_ACTIVE_SESSION",
				});
				return;
			}

			let loggedOutDevices = 0;

			if (logoutAll && req.user) {
				// Logout from all devices
				loggedOutDevices = await SessionService.logoutAllSessions(
					req.user.userId
				);
			} else {
				// Logout from current device only
				const success =
					await SessionService.logoutSession(refreshToken);
				loggedOutDevices = success ? 1 : 0;
			}

			// Clear refresh token cookie
			res.clearCookie("refreshToken");

			res.json({
				message: logoutAll
					? `Logged out from ${loggedOutDevices} device(s)`
					: "Logged out successfully",
				loggedOutDevices,
			});
		} catch (error) {
			console.error("Logout error:", error);

			if (error instanceof z.ZodError) {
				res.status(400).json({
					error: "Invalid request data",
					code: "VALIDATION_ERROR",
					details: error.issues,
				});
				return;
			}

			res.status(500).json({
				error: "Failed to logout",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// GET /api/auth/devices - Get all active devices for current user
	static async getDevices(
		req: Request,
		res: Response<GetDevicesResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "NOT_AUTHENTICATED",
				});
				return;
			}

			const devices = await SessionService.getUserDevices(
				req.user.userId
			);

			res.json({ devices });
		} catch (error) {
			console.error("Get devices error:", error);
			res.status(500).json({
				error: "Failed to get devices",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// DELETE /api/auth/devices/:sessionId - Logout from specific device
	static async logoutDevice(
		req: Request<{ sessionId: string }>,
		res: Response<LogoutDeviceResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "NOT_AUTHENTICATED",
				});
				return;
			}

			const { sessionId } = LogoutDeviceSchema.parse({
				sessionId: req.params.sessionId,
			});

			const success = await SessionService.logoutDevice(
				req.user.userId,
				sessionId
			);

			if (!success) {
				res.status(404).json({
					error: "Device session not found",
					code: "SESSION_NOT_FOUND",
				});
				return;
			}

			// If user is logging out their current session, clear the cookie
			if (req.sessionId === sessionId) {
				res.clearCookie("refreshToken");
			}

			res.json({
				message: "Device logged out successfully",
				success: true,
			});
		} catch (error) {
			console.error("Logout device error:", error);

			if (error instanceof z.ZodError) {
				res.status(400).json({
					error: "Invalid session ID",
					code: "VALIDATION_ERROR",
					details: error.issues,
				});
				return;
			}

			res.status(500).json({
				error: "Failed to logout device",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// GET /api/auth/me - Get current user info
	static async getCurrentUser(req: Request, res: Response): Promise<void> {
		try {
			if (!req.user) {
				res.status(401).json({
					error: "Authentication required",
					code: "NOT_AUTHENTICATED",
				});
				return;
			}

			res.json({
				user: {
					id: req.user.userId,
					email: req.user.email,
					username: req.user.username,
				},
				session: {
					sessionId: req.user.sessionId,
					expiresAt: new Date(req.user.exp * 1000),
				},
			});
		} catch (error) {
			console.error("Get current user error:", error);
			res.status(500).json({
				error: "Failed to get user info",
				code: "INTERNAL_ERROR",
			});
		}
	}

	// Helper: Generate username from email
	private static generateUsernameFromEmail(email: string): string {
		const emailParts = email.split("@");
		const base = (emailParts[0] || "user").toLowerCase();
		const randomSuffix = crypto.randomInt(1000, 9999);
		return `${base}${randomSuffix}`;
	}
}
