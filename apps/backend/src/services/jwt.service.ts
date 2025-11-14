import jwt from "jsonwebtoken";
import config from "../config/env.js";
import type {
	BaseAccessTokenPayload,
	AccessTokenPayload,
	BaseRefreshTokenPayload,
	RefreshTokenPayload,
	BaseAdminTokenPayload,
	AdminTokenPayload,
} from "@repo/shared";

export class JwtService {
	// ================================
	// USER TOKENS
	// ================================

	// Generate user access token (uses shared config)
	static generateAccessToken(payload: BaseAccessTokenPayload): string {
		return jwt.sign(payload, config.JWT_SECRET, {
			expiresIn: `${config.ACCESS_TOKEN_EXPIRY_MINUTES}m`,
			issuer: "ticket-dashboard",
			audience: "ticket-dashboard-client",
		});
	}

	// Generate user refresh token (uses shared config)
	static generateRefreshToken(payload: BaseRefreshTokenPayload): string {
		return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
			expiresIn: `${config.REFRESH_TOKEN_EXPIRY_DAYS}d`,
			issuer: "ticket-dashboard",
			audience: "ticket-dashboard-client",
		});
	}

	// Verify user access token
	static verifyAccessToken(token: string): AccessTokenPayload {
		try {
			return jwt.verify(token, config.JWT_SECRET, {
				issuer: "ticket-dashboard",
				audience: "ticket-dashboard-client",
			}) as AccessTokenPayload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new Error("ACCESS_TOKEN_EXPIRED");
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new Error("INVALID_ACCESS_TOKEN");
			}
			throw new Error("ACCESS_TOKEN_VERIFICATION_FAILED");
		}
	}

	// Verify user refresh token
	static verifyRefreshToken(token: string): RefreshTokenPayload {
		try {
			return jwt.verify(token, config.JWT_REFRESH_SECRET, {
				issuer: "ticket-dashboard",
				audience: "ticket-dashboard-client",
			}) as RefreshTokenPayload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new Error("REFRESH_TOKEN_EXPIRED");
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new Error("INVALID_REFRESH_TOKEN");
			}
			throw new Error("REFRESH_TOKEN_VERIFICATION_FAILED");
		}
	}

	// ================================
	// UTILITY METHODS
	// ================================

	// Extract token from Authorization header
	static extractBearerToken(authHeader: string | undefined): string | null {
		if (!authHeader) return null;

		const parts = authHeader.split(" ");
		if (parts.length !== 2 || parts[0] !== "Bearer") {
			return null;
		}

		return parts[1] || null;
	}

	// ================================
	// ADMIN TOKENS
	// ================================

	// Generate short-lived admin elevation token
	static generateAdminToken(payload: BaseAdminTokenPayload): string {
		return jwt.sign(payload, config.ADMIN_JWT_SECRET, {
			expiresIn: `${config.ADMIN_PRIVILEGE_EXPIRY_MINUTES}m`,
			issuer: "ticket-dashboard",
			audience: "ticket-dashboard-client",
		});
	}

	// Verify admin elevation token
	static verifyAdminToken(token: string): AdminTokenPayload {
		try {
			return jwt.verify(token, config.ADMIN_JWT_SECRET, {
				issuer: "ticket-dashboard",
				audience: "ticket-dashboard-client",
			}) as AdminTokenPayload;
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new Error("ADMIN_TOKEN_EXPIRED");
			}
			if (error instanceof jwt.JsonWebTokenError) {
				throw new Error("ADMIN_TOKEN_INVALID");
			}
			throw new Error("ADMIN_TOKEN_VERIFICATION_FAILED");
		}
	}

	// Extract admin token from X-Admin-Token header
	static extractAdminToken(headerValue: string | undefined): string | null {
		if (!headerValue) return null;
		const token = headerValue.trim();
		return token.length > 0 ? token : null;
	}
}
