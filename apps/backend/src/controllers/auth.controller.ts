import { Request, Response } from "express";
import { UserAuthService } from "../services/user.auth.service.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { ResponseHelper } from "../utils/response-helper.js";
import config from "../config/env.js";
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
	/**
	 * POST /api/auth/login - Send OTP to email
	 */
	static async login(
		req: Request<{}, {}, LoginRequest>,
		res: Response<LoginResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const { email } = LoginSchema.parse(req.body);

			const result = await UserAuthService.sendLoginOtp(email);

			if (!result.success) {
				ErrorHandler.handleBadRequestError(
					res,
					result.message,
					result.code || "OTP_GENERATION_FAILED"
				);
				return;
			}

			ResponseHelper.sendSuccess(res, {
				success: true,
				message: result.message,
				code: result.code,
				data: {
					otpSent: true,
					timing: result.data?.expiresAt
						? {
								expiresAt: result.data.expiresAt,
								expiresIn: result.data.expiresIn,
								issuedAt: new Date().toISOString(),
							}
						: undefined,
					otpConfig: result.data?.config,
				},
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "send login OTP");
		}
	}

	/**
	 * POST /api/auth/verify-otp - Verify OTP and create session
	 */
	static async verifyOtp(
		req: Request<{}, {}, VerifyOtpRequest>,
		res: Response<VerifyOtpResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const { email, otp, deviceInfo } = VerifyOtpSchema.parse(req.body);
			const deviceData = ResponseHelper.extractDeviceInfo(req);

			const result = await UserAuthService.verifyOtpAndAuthenticate(
				email,
				otp,
				{
					userId: "", // Will be set in service
					userAgent: deviceData.userAgent,
					ipAddress: deviceData.ipAddress,
					deviceName: deviceInfo.deviceName || deviceData.deviceName,
					deviceFingerprint: deviceData.deviceFingerprint,
				}
			);

			if (!result.success || !result.user || !result.accessToken) {
				ErrorHandler.handleBadRequestError(
					res,
					result.message || "Invalid OTP",
					"INVALID_OTP"
				);
				return;
			}

			// Set refresh token cookie
			if (result.refreshToken) {
				ResponseHelper.setRefreshTokenCookie(res, result.refreshToken);
			}

			ResponseHelper.sendSuccess(res, {
				success: true,
				code: "LOGIN_SUCCESS",
				data: {
					user: result.user,
					accessToken: result.accessToken,
					timing: {
						accessToken: {
							expiresAt: new Date(
								Date.now() +
									config.ACCESS_TOKEN_EXPIRY_MINUTES *
										60 *
										1000
							).toISOString(),
							expiresIn: config.ACCESS_TOKEN_EXPIRY_MINUTES * 60,
							issuedAt: new Date().toISOString(),
						},
						refreshToken: {
							expiresAt: new Date(
								Date.now() +
									config.REFRESH_TOKEN_EXPIRY_DAYS *
										24 *
										60 *
										60 *
										1000
							).toISOString(),
							expiresIn:
								config.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
							issuedAt: new Date().toISOString(),
						},
					},
					isNewUser: result.isNewUser,
				},
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "verify OTP");
		}
	}

	/**
	 * POST /api/auth/refresh - Refresh access token
	 */
	static async refreshToken(
		req: Request,
		res: Response<RefreshTokenResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const refreshToken = req.cookies?.refreshToken;

			if (!refreshToken) {
				ErrorHandler.handleAuthError(
					res,
					"Refresh token required",
					"MISSING_REFRESH_TOKEN"
				);
				return;
			}

			const result = await UserAuthService.refreshUserToken(refreshToken);

			if (!result) {
				ResponseHelper.clearRefreshTokenCookie(res);
				ErrorHandler.handleAuthError(
					res,
					"Invalid or expired refresh token",
					"INVALID_REFRESH_TOKEN"
				);
				return;
			}

			ResponseHelper.sendSuccess(res, {
				accessToken: result.accessToken,
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "refresh token");
		}
	}

	/**
	 * POST /api/auth/logout - Logout from current or all devices
	 */
	static async logout(
		req: Request<{}, {}, LogoutRequest>,
		res: Response<LogoutResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			const { logoutAll } = LogoutSchema.parse(req.body);
			const refreshToken = req.cookies?.refreshToken;

			if (!refreshToken) {
				ErrorHandler.handleAuthError(
					res,
					"No active session found",
					"NO_ACTIVE_SESSION"
				);
				return;
			}

			let loggedOutDevices = 0;

			if (logoutAll && req.user) {
				loggedOutDevices = await UserAuthService.logoutFromAllDevices(
					req.user.userId
				);
			} else {
				const success =
					await UserAuthService.logoutFromDevice(refreshToken);
				loggedOutDevices = success ? 1 : 0;
			}

			ResponseHelper.clearRefreshTokenCookie(res);

			ResponseHelper.sendSuccess(res, {
				message: logoutAll
					? `Logged out from ${loggedOutDevices} device(s)`
					: "Logged out successfully",
				loggedOutDevices,
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "logout");
		}
	}

	/**
	 * GET /api/auth/devices - Get user's active devices
	 */
	static async getDevices(
		req: Request,
		res: Response<GetDevicesResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			if (!req.user) {
				ErrorHandler.handleAuthError(
					res,
					"Authentication required",
					"NOT_AUTHENTICATED"
				);
				return;
			}

			const devices = await UserAuthService.getUserDevices(
				req.user.userId
			);

			ResponseHelper.sendSuccess(res, { devices });
		} catch (error) {
			ErrorHandler.handleError(res, error, "get devices");
		}
	}

	/**
	 * DELETE /api/auth/devices/:sessionId - Logout from specific device
	 */
	static async logoutDevice(
		req: Request<{ sessionId: string }>,
		res: Response<LogoutDeviceResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			if (!req.user) {
				ErrorHandler.handleAuthError(
					res,
					"Authentication required",
					"NOT_AUTHENTICATED"
				);
				return;
			}

			const { sessionId } = LogoutDeviceSchema.parse({
				sessionId: req.params.sessionId,
			});

			const success = await UserAuthService.logoutFromSpecificDevice(
				req.user.userId,
				sessionId
			);

			if (!success) {
				ErrorHandler.handleNotFoundError(
					res,
					"Device session not found"
				);
				return;
			}

			// Clear cookie if user is logging out their current session
			if (req.sessionId === sessionId) {
				ResponseHelper.clearRefreshTokenCookie(res);
			}

			ResponseHelper.sendSuccess(res, {
				message: "Device logged out successfully",
				success: true,
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "logout device");
		}
	}

	/**
	 * GET /api/auth/me - Get current user info
	 */
	static async getCurrentUser(req: Request, res: Response): Promise<void> {
		try {
			if (!req.user) {
				ErrorHandler.handleAuthError(
					res,
					"Authentication required",
					"NOT_AUTHENTICATED"
				);
				return;
			}

			ResponseHelper.sendSuccess(res, {
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
			ErrorHandler.handleError(res, error, "get current user");
		}
	}

	/**
	 * PUT /api/auth/profile - Update user profile
	 */
	static async updateProfile(req: Request, res: Response): Promise<void> {
		try {
			if (!req.user) {
				ErrorHandler.handleAuthError(
					res,
					"Authentication required",
					"NOT_AUTHENTICATED"
				);
				return;
			}

			const { username } = req.body;

			// Basic validation
			if (
				!username ||
				typeof username !== "string" ||
				username.trim().length === 0
			) {
				ErrorHandler.handleBadRequestError(
					res,
					"Username is required and must be a non-empty string",
					"INVALID_INPUT"
				);
				return;
			}

			// Validate username format (basic rules)
			const trimmedUsername = username.trim();
			if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
				ErrorHandler.handleBadRequestError(
					res,
					"Username must be between 2 and 50 characters",
					"INVALID_USERNAME_LENGTH"
				);
				return;
			}

			// Check for valid characters (letters, numbers, underscores, hyphens)
			const usernameRegex = /^[a-zA-Z0-9_-]+$/;
			if (!usernameRegex.test(trimmedUsername)) {
				ErrorHandler.handleBadRequestError(
					res,
					"Username can only contain letters, numbers, underscores, and hyphens",
					"INVALID_USERNAME_FORMAT"
				);
				return;
			}

			try {
				const success = await UserAuthService.updateUserProfile(
					req.user.userId,
					{ username: trimmedUsername }
				);

				if (!success) {
					ErrorHandler.handleBadRequestError(
						res,
						"Failed to update profile",
						"UPDATE_FAILED"
					);
					return;
				}
			} catch (serviceError: any) {
				if (serviceError.code === "USERNAME_EXISTS") {
					ErrorHandler.handleBadRequestError(
						res,
						"This username is already taken. Please choose a different one.",
						"USERNAME_EXISTS"
					);
					return;
				}
				// Re-throw other errors to be handled by the outer catch block
				throw serviceError;
			}

			ResponseHelper.sendSuccess(res, {
				success: true,
				user: {
					id: req.user.userId,
					email: req.user.email,
					username: trimmedUsername,
				},
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "update profile");
		}
	}
}
