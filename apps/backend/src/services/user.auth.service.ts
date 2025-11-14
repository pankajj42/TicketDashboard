import { OtpService } from "./otp.service.js";
import { CreateSessionOptions, SessionService } from "./session.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserMapper } from "../mappers/api.mappers.js";
import type { ApiUser, OtpResponse } from "@repo/shared";

export interface AuthResult {
	success: boolean;
	user?: ApiUser;
	accessToken?: string;
	refreshToken?: string;
	isNewUser?: boolean;
	message?: string;
	// When OTP verification fails, include error code and remaining attempts
	code?: string;
	attemptsRemaining?: number;
}

// Enhanced LoginResult to include OTP timing information
export interface LoginResult extends Omit<OtpResponse, "success"> {
	success: boolean;
}

export class UserAuthService {
	/**
	 * Send OTP to user's email with timing information
	 */
	static async sendLoginOtp(email: string): Promise<LoginResult> {
		const result = await OtpService.generateAndSendOtp(email);

		// Return the full OTP response with timing information
		return {
			success: result.success,
			message: result.message,
			code: result.code,
			data: result.data,
		};
	}

	/**
	 * Verify OTP and authenticate user
	 */
	static async verifyOtpAndAuthenticate(
		email: string,
		otp: string,
		sessionOptions: CreateSessionOptions
	): Promise<AuthResult> {
		// Verify OTP
		const otpResult = await OtpService.verifyOtp(email, otp);

		if (!otpResult.success) {
			return {
				success: false,
				message: otpResult.message || "Invalid OTP",
				code: otpResult.code,
				attemptsRemaining: otpResult.attemptsRemaining,
			};
		}

		// Get or create user
		const { user, isNewUser } = await this.getOrCreateUser(email);

		// If user has an active admin elevation on another session, block login
		if (
			user.adminElevatedUntil &&
			user.adminElevatedUntil > new Date() &&
			user.adminElevatedSessionId
		) {
			return {
				success: false,
				message:
					"Admin elevation is active on another device. Revoke it before logging in.",
				code: "ADMIN_ELEVATION_ACTIVE",
			};
		}

		// Create session
		const sessionData = await SessionService.createSession({
			userId: user.id,
			userAgent: sessionOptions.userAgent,
			ipAddress: sessionOptions.ipAddress,
			deviceName: sessionOptions.deviceName,
			deviceFingerprint: sessionOptions.deviceFingerprint,
		} as CreateSessionOptions);

		return {
			success: true,
			user: UserMapper.toApiUser(user),
			accessToken: sessionData.accessToken,
			refreshToken: sessionData.refreshToken,
			isNewUser,
		};
	}

	/**
	 * Refresh user's access token
	 */
	static async refreshUserToken(
		refreshToken: string
	): Promise<{ accessToken: string } | null> {
		return await SessionService.refreshSession(refreshToken);
	}

	/**
	 * Logout user from current device
	 */
	static async logoutFromDevice(refreshToken: string): Promise<boolean> {
		return await SessionService.logoutSession(refreshToken);
	}

	/**
	 * Logout user from all devices
	 */
	static async logoutFromAllDevices(userId: string): Promise<number> {
		return await SessionService.logoutAllSessions(userId);
	}

	/**
	 * Logout user from specific device
	 */
	static async logoutFromSpecificDevice(
		userId: string,
		sessionId: string
	): Promise<boolean> {
		return await SessionService.logoutDevice(userId, sessionId);
	}

	/**
	 * Get user's active devices
	 */
	static async getUserDevices(userId: string) {
		return await SessionService.getUserDevices(userId);
	}

	/**
	 * Get or create user by email
	 */
	private static async getOrCreateUser(
		email: string
	): Promise<{ user: any; isNewUser: boolean }> {
		let user = await UserRepository.findByEmail(email);
		let isNewUser = false;

		if (!user) {
			isNewUser = true;
			user = await UserRepository.create(email);
		} else {
			// Update last login for existing users
			await UserRepository.updateLastLogin(user.id);
		}

		return { user, isNewUser };
	}

	/**
	 * Update user profile information
	 */
	static async updateUserProfile(
		userId: string,
		updates: { username: string }
	): Promise<boolean> {
		try {
			const result = await UserRepository.updateProfile(userId, updates);
			return result !== null;
		} catch (error: any) {
			// Re-throw specific business logic errors to be handled by the controller
			if (error.code === "USERNAME_EXISTS") {
				throw error;
			}

			// Log unexpected service layer errors
			console.error("Unexpected error in user profile service:", error);
			return false;
		}
	}
}
