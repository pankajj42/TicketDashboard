import { Request, Response } from "express";
import { UserAuthService } from "../services/auth.service.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { ResponseHelper } from "../utils/response-helper.js";
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
					"OTP_GENERATION_FAILED"
				);
				return;
			}

			ResponseHelper.sendSuccess(res, {
				message: result.message,
				otpSent: true,
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
				user: result.user,
				accessToken: result.accessToken,
				isNewUser: result.isNewUser,
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
}
