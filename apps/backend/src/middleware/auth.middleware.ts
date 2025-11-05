import { Request, Response, NextFunction } from "express";
import { JwtService } from "../services/jwt.service.js";
import { SessionService } from "../services/session.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import type { AccessTokenPayload, ApiErrorResponse } from "@repo/shared";

// Enhanced user data for request object
interface RequestUser extends AccessTokenPayload {
	email: string;
	username: string;
}

// Extend Express Request type to include user
declare global {
	namespace Express {
		interface Request {
			user?: RequestUser;
			sessionId?: string;
		}
	}
}

// Authentication middleware - requires valid access token
export const authenticateToken = async (
	req: Request,
	res: Response<ApiErrorResponse>,
	next: NextFunction
): Promise<void> => {
	try {
		const authHeader = req.headers.authorization;
		const token = JwtService.extractBearerToken(authHeader);

		if (!token) {
			res.status(401).json({
				error: "Access token required",
				code: "MISSING_TOKEN",
			});
			return;
		}

		// Validate session
		const payload = await SessionService.validateSession(token);

		if (!payload) {
			res.status(401).json({
				error: "Invalid or expired access token",
				code: "INVALID_TOKEN",
			});
			return;
		}

		// Fetch fresh user data from database (JWT only has userId)
		const user = await UserRepository.findById(payload.userId);

		if (!user) {
			res.status(401).json({
				error: "User not found or inactive",
				code: "USER_NOT_FOUND",
			});
			return;
		}

		// Attach user info to request (JWT payload + DB data)
		req.user = {
			...payload,
			email: user.email,
			username: user.username,
		};
		req.sessionId = payload.sessionId;

		next();
	} catch (error) {
		console.error("Authentication error:", error);

		if (error instanceof Error) {
			switch (error.message) {
				case "ACCESS_TOKEN_EXPIRED":
					res.status(401).json({
						error: "Access token expired",
						code: "TOKEN_EXPIRED",
					});
					return;

				case "INVALID_ACCESS_TOKEN":
					res.status(401).json({
						error: "Invalid access token format",
						code: "INVALID_TOKEN_FORMAT",
					});
					return;

				default:
					res.status(401).json({
						error: "Authentication failed",
						code: "AUTH_FAILED",
					});
					return;
			}
		}

		res.status(500).json({
			error: "Internal server error during authentication",
			code: "INTERNAL_ERROR",
		});
	}
};

// Rate limiting middleware for auth endpoints
export const authRateLimit = (
	maxAttempts: number = 5,
	windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
	const attempts = new Map<string, { count: number; resetTime: number }>();

	return (
		req: Request,
		res: Response<ApiErrorResponse>,
		next: NextFunction
	): void => {
		const clientId = req.ip || "unknown";
		const now = Date.now();

		// Clean up expired entries
		for (const [key, value] of attempts.entries()) {
			if (now > value.resetTime) {
				attempts.delete(key);
			}
		}

		const userAttempts = attempts.get(clientId);

		if (!userAttempts) {
			attempts.set(clientId, { count: 1, resetTime: now + windowMs });
			next();
			return;
		}

		if (userAttempts.count >= maxAttempts) {
			const timeLeft = Math.ceil(
				(userAttempts.resetTime - now) / 1000 / 60
			);
			res.status(429).json({
				error: `Too many authentication attempts. Try again in ${timeLeft} minutes`,
				code: "RATE_LIMIT_EXCEEDED",
			});
			return;
		}

		userAttempts.count++;
		next();
	};
};

// Middleware to validate device info in request
export const validateDeviceInfo = (
	req: Request,
	res: Response<ApiErrorResponse>,
	next: NextFunction
): void => {
	const userAgent = req.headers["user-agent"];

	if (!userAgent) {
		res.status(400).json({
			error: "User-Agent header required",
			code: "MISSING_USER_AGENT",
		});
		return;
	}

	// Attach device info to request
	(req as any).deviceInfo = {
		userAgent,
		ipAddress: req.ip || "unknown",
		deviceName: req.body.deviceInfo?.deviceName,
	};

	next();
};

// Error handler for authentication routes
export const authErrorHandler = (
	error: Error,
	req: Request,
	res: Response<ApiErrorResponse>,
	next: NextFunction
): void => {
	console.error("Auth route error:", error);

	// Handle specific auth errors
	if (error.message.includes("OTP")) {
		res.status(400).json({
			error: error.message,
			code: "OTP_ERROR",
		});
		return;
	}

	if (error.message.includes("session") || error.message.includes("token")) {
		res.status(401).json({
			error: error.message,
			code: "SESSION_ERROR",
		});
		return;
	}

	// Generic error response
	res.status(500).json({
		error: "Authentication service error",
		code: "AUTH_SERVICE_ERROR",
	});
};
