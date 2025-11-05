import { Response } from "express";
import config from "../config/env.js";

export class ResponseHelper {
	/**
	 * Set secure refresh token cookie
	 */
	static setRefreshTokenCookie(res: Response, refreshToken: string): void {
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: !config.isDevelopment,
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			path: "/",
		});
	}

	/**
	 * Clear refresh token cookie
	 */
	static clearRefreshTokenCookie(res: Response): void {
		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure: !config.isDevelopment,
			sameSite: "strict",
			path: "/",
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
	 * Send success message
	 */
	static sendMessage(
		res: Response,
		message: string,
		statusCode: number = 200
	): void {
		res.status(statusCode).json({ message });
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
