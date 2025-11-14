import { z } from "zod";
import {
	LoginSchema,
	VerifyOtpSchema,
	LogoutDeviceSchema,
	LogoutSchema,
	UpdateProfileSchema,
	AdminElevationRequestSchema,
	AdminElevationResponseSchema,
	AdminRevokeResponseSchema,
} from "./schemas.js";

// API Response Types (clean, no internal DB fields)
export interface ApiUser {
	id: string;
	email: string;
	username: string;
}

export interface ApiDeviceInfo {
	id: string;
	deviceName: string;
	userAgent: string;
	ipAddress: string;
	lastUsed: Date;
	createdAt: Date;
}

// Inferred request types
export type LoginRequest = z.infer<typeof LoginSchema>;
export type VerifyOtpRequest = z.infer<typeof VerifyOtpSchema>;
export type LogoutRequest = z.infer<typeof LogoutSchema>;
export type LogoutDeviceRequest = z.infer<typeof LogoutDeviceSchema>;
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;
export type AdminElevationRequest = z.infer<typeof AdminElevationRequestSchema>;
export type AdminElevationResponse = z.infer<
	typeof AdminElevationResponseSchema
>;
export type AdminRevokeResponse = z.infer<typeof AdminRevokeResponseSchema>;

// Responses used across the app (that aren't in timing.ts)
export interface RefreshTokenResponse {
	accessToken: string;
}

export interface LogoutResponse {
	message: string;
	loggedOutDevices: number;
}

export interface GetDevicesResponse {
	devices: ApiDeviceInfo[];
}

export interface LogoutDeviceResponse {
	message: string;
	success: boolean;
}

export interface GetCurrentUserResponse {
	user: ApiUser;
	session: {
		sessionId: string;
		expiresAt: Date;
		isAdmin?: boolean;
		adminExpiresAt?: string; // ISO string when elevated
	};
}

// Error Response Types
// ApiErrorResponse moved to shared/errors.ts for reuse

// ========================================
// JWT PAYLOAD TYPES
// ========================================

// Base JWT Payload Types (without JWT standard claims)
// SECURITY NOTE: JWT payloads are base64 encoded, NOT encrypted!
// Only include non-sensitive data that's safe to be publicly readable
export interface BaseAccessTokenPayload {
	userId: string; // UUID - minimal identifier needed
	sessionId: string; // Session identifier for validation
}

export interface BaseRefreshTokenPayload {
	userId: string;
	sessionId: string;
	deviceId: string; // Persistent device fingerprint
}

// Admin JWT payloads
export interface BaseAdminTokenPayload {
	userId: string;
	sessionId: string;
	jti: string;
	scope: "admin:elevated";
}

// JWT Standard Claims
export interface JwtStandardClaims {
	iat: number; // Issued at
	exp: number; // Expiration time
	iss: string; // Issuer
	aud: string; // Audience
}

// JWT Payload Types with standard JWT claims (for verified tokens)
export type AccessTokenPayload = BaseAccessTokenPayload & JwtStandardClaims;
export type RefreshTokenPayload = BaseRefreshTokenPayload & JwtStandardClaims;
export type AdminTokenPayload = BaseAdminTokenPayload & JwtStandardClaims;
