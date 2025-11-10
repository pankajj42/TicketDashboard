import jwt from "jsonwebtoken";
import config from "../config/env.js";
import type {
	BaseAccessTokenPayload,
	AccessTokenPayload,
	BaseRefreshTokenPayload,
	RefreshTokenPayload,
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
}
