import { Request, Response } from "express";
import { UserAuthService } from "../services/user.auth.service.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { ResponseHelper } from "../utils/response-helper.js";
import config from "../config/env.js";
import { ERROR_CODES, SUCCESS_CODES } from "@repo/shared";
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
	UpdateProfileRequest,
	AdminElevationRequest,
	AdminElevationResponse,
	AdminRevokeResponse,
} from "@repo/shared";
import {
	LoginSchema,
	VerifyOtpSchema,
	LogoutSchema,
	LogoutDeviceSchema,
	UpdateProfileSchema,
	AdminElevationRequestSchema,
} from "@repo/shared";
import { AdminService } from "../services/admin.service.js";
import { UserRepository } from "../repositories/user.repository.js";

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
					result.code || ERROR_CODES.BAD_REQUEST
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
					result.code || ERROR_CODES.OTP_INVALID,
					result.attemptsRemaining !== undefined
						? { attemptsRemaining: result.attemptsRemaining }
						: undefined
				);
				return;
			}

			// Set refresh token cookie
			if (result.refreshToken) {
				ResponseHelper.setRefreshTokenCookie(res, result.refreshToken);
			}

			ResponseHelper.sendSuccess(res, {
				success: true,
				code: SUCCESS_CODES.LOGIN_SUCCESS,
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
					ERROR_CODES.MISSING_REFRESH_TOKEN
				);
				return;
			}

			const result = await UserAuthService.refreshUserToken(refreshToken);

			if (!result) {
				ResponseHelper.clearRefreshTokenCookie(res);
				ErrorHandler.handleAuthError(
					res,
					"Invalid or expired refresh token",
					ERROR_CODES.INVALID_REFRESH_TOKEN
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
					ERROR_CODES.NO_ACTIVE_SESSION
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
				code: logoutAll
					? SUCCESS_CODES.LOGOUT_ALL_SUCCESS
					: SUCCESS_CODES.LOGOUT_SUCCESS,
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
					ERROR_CODES.NOT_AUTHENTICATED
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
					ERROR_CODES.NOT_AUTHENTICATED
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
				code: SUCCESS_CODES.LOGOUT_SUCCESS,
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
					ERROR_CODES.NOT_AUTHENTICATED
				);
				return;
			}

			const isAdmin = await AdminService.isSessionElevated(
				req.user.userId,
				req.user.sessionId
			);

			// Include admin expiry so the frontend can restore countdown after refresh
			let adminExpiresAt: string | undefined = undefined;
			if (isAdmin) {
				const dbUser = await UserRepository.findById(req.user.userId);
				if (
					dbUser?.adminElevatedSessionId === req.user.sessionId &&
					dbUser.adminElevatedUntil &&
					dbUser.adminElevatedUntil > new Date()
				) {
					adminExpiresAt = dbUser.adminElevatedUntil.toISOString();
				}
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
					isAdmin,
					adminExpiresAt,
				},
			});
		} catch (error) {
			ErrorHandler.handleError(res, error, "get current user");
		}
	}

	/**
	 * POST /api/auth/admin-elevation - Elevate privileges for 15 minutes
	 */
	static async elevateAdmin(
		req: Request<{}, {}, AdminElevationRequest>,
		res: Response<AdminElevationResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			if (!req.user) {
				ErrorHandler.handleAuthError(
					res,
					"Authentication required",
					ERROR_CODES.NOT_AUTHENTICATED
				);
				return;
			}

			const { password } = AdminElevationRequestSchema.parse(req.body);
			const device = ResponseHelper.extractDeviceInfo(req);

			const { adminToken, expiresAt } = await AdminService.elevate({
				userId: req.user.userId,
				sessionId: req.user.sessionId,
				password,
				ipAddress: device.ipAddress,
				userAgent: device.userAgent,
			});

			ResponseHelper.sendSuccess<AdminElevationResponse>(res, {
				adminToken,
				expiresAt: expiresAt.toISOString(),
			});
		} catch (error) {
			if (error instanceof Error) {
				switch (error.message) {
					case "ADMIN_PASSWORD_REQUIRED":
						ErrorHandler.handleBadRequestError(
							res,
							"Admin password required",
							ERROR_CODES.ADMIN_PASSWORD_REQUIRED
						);
						return;
					case "ADMIN_PASSWORD_INVALID":
						ErrorHandler.handleAuthError(
							res,
							"Invalid admin password",
							ERROR_CODES.ADMIN_PASSWORD_INVALID
						);
						return;
					case "ADMIN_ELEVATION_ACTIVE":
						ErrorHandler.handleAuthError(
							res,
							"Admin elevation is already active on another device",
							ERROR_CODES.ADMIN_ELEVATION_ACTIVE
						);
						return;
					default:
					// fallthrough
				}
			}
			ErrorHandler.handleError(res, error, "elevate admin");
		}
	}

	/**
	 * DELETE /api/auth/admin-elevation - Revoke admin elevation
	 */
	static async revokeAdmin(
		req: Request,
		res: Response<AdminRevokeResponse | ApiErrorResponse>
	): Promise<void> {
		try {
			if (!req.user) {
				ErrorHandler.handleAuthError(
					res,
					"Authentication required",
					ERROR_CODES.NOT_AUTHENTICATED
				);
				return;
			}

			await AdminService.revoke({
				userId: req.user.userId,
				sessionId: req.user.sessionId,
			});

			ResponseHelper.sendSuccess<AdminRevokeResponse>(res, {
				success: true,
			});
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === "ADMIN_ELEVATION_NOT_FOUND"
			) {
				ErrorHandler.handleNotFoundError(
					res,
					"No active admin elevation found"
				);
				return;
			}
			ErrorHandler.handleError(res, error, "revoke admin");
		}
	}

	/**
	 * PUT /api/auth/profile - Update user profile
	 */
	static async updateProfile(
		req: Request<{}, {}, UpdateProfileRequest>,
		res: Response<
			| {
					success: boolean;
					user: { id: string; email: string; username: string };
			  }
			| ApiErrorResponse
		>
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

			const { username } = UpdateProfileSchema.parse(req.body);
			const trimmedUsername = username.trim();

			try {
				const success = await UserAuthService.updateUserProfile(
					req.user.userId,
					{ username: trimmedUsername }
				);

				if (!success) {
					ErrorHandler.handleBadRequestError(
						res,
						"Failed to update profile",
						ERROR_CODES.UPDATE_FAILED
					);
					return;
				}
			} catch (serviceError: any) {
				if (serviceError.code === ERROR_CODES.USERNAME_EXISTS) {
					ErrorHandler.handleBadRequestError(
						res,
						"This username is already taken. Please choose a different one.",
						ERROR_CODES.USERNAME_EXISTS
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
