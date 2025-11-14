import { Request, Response, NextFunction } from "express";
import { JwtService } from "../services/jwt.service.js";
import { SessionService } from "../services/session.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { ERROR_CODES } from "@repo/shared";
import { ResponseHelper } from "../utils/response-helper.js";
import type { AccessTokenPayload, ApiErrorResponse } from "@repo/shared";
import config from "../config/env.js";
import { redis } from "../lib/redis.js";

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
				ERROR_CODES.MISSING_TOKEN
			);
			return;
		}

		const user = await validateTokenAndGetUser(token);

		if (!user) {
			ErrorHandler.handleAuthError(
				res,
				"Invalid or expired access token",
				ERROR_CODES.INVALID_TOKEN
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
 * Redis-backed rate limiting middleware (fixed window)
 * Uses Redis INCR + PEXPIRE to track attempts per key within a window.
 * The key is based on client IP by default, and can be customized via keySelector.
 */
export const createRedisRateLimit = (
	prefix: string = "auth",
	maxAttempts: number = config.USER_AUTH_ATTEMPTS_LIMIT,
	windowMs: number = config.USER_AUTH_RATE_LIMIT_SECONDS * 1000,
	keySelector?: (req: Request) => string
) => {
	return async (
		req: Request,
		res: Response<ApiErrorResponse>,
		next: NextFunction
	): Promise<void> => {
		try {
			const idPart = keySelector
				? keySelector(req)
				: ResponseHelper.extractIpAddress(req);
			const key = `rl:${prefix}:${idPart}`;

			// Increment the counter and set expiry on first hit
			const count = await redis.incr(key);
			if (count === 1) {
				await redis.pexpire(key, windowMs);
			}

			if (count > maxAttempts) {
				const ttlMs = await redis.pttl(key);
				const timeLeft = ttlMs > 0 ? Math.ceil(ttlMs / 1000) : 0;
				ErrorHandler.handleRateLimitError(res, timeLeft);
				return;
			}

			next();
		} catch (error) {
			// In case Redis is unavailable, fail-open to avoid blocking auth
			console.error("Rate limit middleware error:", error);
			next();
		}
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
			ERROR_CODES.MISSING_USER_AGENT
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
					ERROR_CODES.TOKEN_EXPIRED
				);
				return;
			case "INVALID_ACCESS_TOKEN":
				ErrorHandler.handleAuthError(
					res,
					"Invalid access token format",
					ERROR_CODES.INVALID_TOKEN_FORMAT
				);
				return;
			default:
				ErrorHandler.handleAuthError(
					res,
					"Authentication failed",
					ERROR_CODES.AUTH_FAILED
				);
				return;
		}
	}

	ErrorHandler.handleInternalError(
		res,
		"Internal server error during authentication"
	);
}
