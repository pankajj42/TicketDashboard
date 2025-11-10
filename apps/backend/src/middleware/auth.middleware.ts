import { Request, Response, NextFunction } from "express";
import { JwtService } from "../services/jwt.service.js";
import { SessionService } from "../services/session.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { ResponseHelper } from "../utils/response-helper.js";
import type { AccessTokenPayload, ApiErrorResponse } from "@repo/shared";
import config from "../config/env.js";

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

/**
 * Main authentication middleware - requires valid access token
 */
export const authenticateToken = async (
	req: Request,
	res: Response<ApiErrorResponse>,
	next: NextFunction
): Promise<void> => {
	try {
		const token = JwtService.extractBearerToken(req.headers.authorization);

		if (!token) {
			ErrorHandler.handleAuthError(
				res,
				"Access token required",
				"MISSING_TOKEN"
			);
			return;
		}

		const user = await validateTokenAndGetUser(token);

		if (!user) {
			ErrorHandler.handleAuthError(
				res,
				"Invalid or expired access token",
				"INVALID_TOKEN"
			);
			return;
		}

		// Attach user info to request
		req.user = user;
		req.sessionId = user.sessionId;

		next();
	} catch (error) {
		handleAuthMiddlewareError(res, error);
	}
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const createAuthRateLimit = (
	maxAttempts: number = config.USER_AUTH_ATTEMPTS_LIMIT,
	windowMs: number = config.USER_AUTH_RATE_LIMIT_SECONDS * 1000
) => {
	const attempts = new Map<string, { count: number; resetTime: number }>();

	return (
		req: Request,
		res: Response<ApiErrorResponse>,
		next: NextFunction
	): void => {
		const clientId = ResponseHelper.extractIpAddress(req);
		const now = Date.now();

		// Clean expired entries
		cleanExpiredAttempts(attempts, now);

		const userAttempts = attempts.get(clientId);

		if (!userAttempts) {
			attempts.set(clientId, { count: 1, resetTime: now + windowMs });
			next();
			return;
		}

		if (userAttempts.count >= maxAttempts) {
			const timeLeft = Math.ceil((userAttempts.resetTime - now) / 1000);
			ErrorHandler.handleRateLimitError(res, timeLeft);
			return;
		}

		userAttempts.count++;
		next();
	};
};

/**
 * Middleware to validate device information
 */
export const validateDeviceInfo = (
	req: Request,
	res: Response<ApiErrorResponse>,
	next: NextFunction
): void => {
	const userAgent = req.headers["user-agent"];

	if (!userAgent) {
		ErrorHandler.handleBadRequestError(
			res,
			"User-Agent header required",
			"MISSING_USER_AGENT"
		);
		return;
	}

	// Attach device info to request
	(req as any).deviceInfo = ResponseHelper.extractDeviceInfo(req);

	next();
};

// ===== HELPER FUNCTIONS =====

/**
 * Validate token and return user data
 */
async function validateTokenAndGetUser(
	token: string
): Promise<RequestUser | null> {
	// Validate session
	const payload = await SessionService.validateSession(token);
	if (!payload) return null;

	// Fetch fresh user data from database
	const user = await UserRepository.findById(payload.userId);
	if (!user) return null;

	return {
		...payload,
		email: user.email,
		username: user.username,
	};
}

/**
 * Clean expired rate limit attempts
 */
function cleanExpiredAttempts(
	attempts: Map<string, { count: number; resetTime: number }>,
	now: number
): void {
	for (const [key, value] of attempts.entries()) {
		if (now > value.resetTime) {
			attempts.delete(key);
		}
	}
}

/**
 * Handle authentication middleware errors
 */
function handleAuthMiddlewareError(
	res: Response<ApiErrorResponse>,
	error: unknown
): void {
	console.error("Authentication middleware error:", error);

	if (error instanceof Error) {
		switch (error.message) {
			case "ACCESS_TOKEN_EXPIRED":
				ErrorHandler.handleAuthError(
					res,
					"Access token expired",
					"TOKEN_EXPIRED"
				);
				return;
			case "INVALID_ACCESS_TOKEN":
				ErrorHandler.handleAuthError(
					res,
					"Invalid access token format",
					"INVALID_TOKEN_FORMAT"
				);
				return;
			default:
				ErrorHandler.handleAuthError(
					res,
					"Authentication failed",
					"AUTH_FAILED"
				);
				return;
		}
	}

	ErrorHandler.handleInternalError(
		res,
		"Internal server error during authentication"
	);
}
