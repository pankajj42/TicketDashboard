import { Response } from "express";
import config from "../config/env.js";

export class ResponseHelper {
	/**
	 * Set secure refresh token cookie
	 */
	static setRefreshTokenCookie(res: Response, refreshToken: string): void {
		const sameSite = config.COOKIE_SAME_SITE || "strict";
		const secure =
			typeof config.COOKIE_SECURE === "boolean"
				? config.COOKIE_SECURE
				: sameSite === "none"
					? true
					: !config.isDevelopment;
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure,
			sameSite,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			path: "/",
			...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
		});
	}

	/**
	 * Clear refresh token cookie
	 */
	static clearRefreshTokenCookie(res: Response): void {
		const sameSite = config.COOKIE_SAME_SITE || "strict";
		const secure =
			typeof config.COOKIE_SECURE === "boolean"
				? config.COOKIE_SECURE
				: sameSite === "none"
					? true
					: !config.isDevelopment;
		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure,
			sameSite,
			path: "/",
			...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
		});
	}

	/**
	 * Send success response with data
	 */
	static sendSuccess<T>(
		res: Response,
		data: T,
		statusCode: number = 200
	): void {
		res.status(statusCode).json(data);
	}

	/**
	 * Extract IP address from request
	 */
	static extractIpAddress(req: any): string {
		return (
			req.ip ||
			req.connection?.remoteAddress ||
			req.socket?.remoteAddress ||
			req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
			"unknown"
		);
	}

	/**
	 * Extract device info from request
	 */
	static extractDeviceInfo(req: any) {
		return {
			userAgent: req.headers["user-agent"] || "unknown",
			ipAddress: this.extractIpAddress(req),
			deviceName: req.body.deviceInfo?.deviceName,
			deviceFingerprint: req.body.deviceInfo?.deviceFingerprint,
		};
	}
}
