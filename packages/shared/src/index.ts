import { z } from "zod";

export const title = "Project Title Here";

// Utility functions
export const formatDate = (date: Date): string => {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
};

export const generateId = (): string => {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

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

// ========================================
// VALIDATION SCHEMAS (using Zod)
// ========================================

// Auth validation schemas
export const LoginSchema = z.object({
	email: z.string().email("Invalid email format"),
});

export const VerifyOtpSchema = z.object({
	email: z.string().email("Invalid email format"),
	otp: z
		.string()
		.length(6, "OTP must be 6 digits")
		.regex(/^\d+$/, "OTP must contain only numbers"),
	deviceInfo: z.object({
		userAgent: z.string().min(1, "User agent required"),
		deviceName: z.string().optional(),
	}),
});

export const AdminElevationSchema = z.object({
	adminPassword: z.string().min(1, "Admin password required"),
});

export const LogoutSchema = z.object({
	logoutAll: z.boolean().optional().default(false),
});

export const LogoutDeviceSchema = z.object({
	sessionId: z.string().uuid("Invalid session ID"),
});

// ========================================
// INFERRED TYPES FROM SCHEMAS
// ========================================

// Auth Request Types (inferred from schemas)
export type LoginRequest = z.infer<typeof LoginSchema>;
export type VerifyOtpRequest = z.infer<typeof VerifyOtpSchema>;
export type AdminElevationRequest = z.infer<typeof AdminElevationSchema>;
export type LogoutRequest = z.infer<typeof LogoutSchema>;
export type LogoutDeviceRequest = z.infer<typeof LogoutDeviceSchema>;

// Auth Response Types
export interface LoginResponse {
	message: string;
	otpSent: boolean;
}

export interface VerifyOtpResponse {
	success: true;
	user: ApiUser;
	accessToken: string;
	isNewUser?: boolean;
}

export interface AdminElevationResponse {
	success: true;
	adminAccessToken: string;
	expiresAt: string;
}

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
	};
}

// Error Response Types
export interface ApiErrorResponse {
	error: string;
	code?: string;
	details?: any;
}

// ========================================
// JWT PAYLOAD TYPES
// ========================================

// Base JWT Payload Types (without JWT standard claims)
// SECURITY NOTE: JWT payloads are base64 encoded, NOT encrypted!
// Only include non-sensitive data that's safe to be publicly readable
export interface BaseAccessTokenPayload {
	userId: string; // UUID - minimal identifier needed
	sessionId: string; // Session identifier for validation
	// Removed: email, username (sensitive data)
}

export interface BaseAdminAccessTokenPayload extends BaseAccessTokenPayload {
	isAdmin: true; // Flag to indicate admin privileges
}

export interface BaseRefreshTokenPayload {
	userId: string;
	sessionId: string;
	deviceId: string; // Persistent device fingerprint
}

export interface BaseAdminRefreshTokenPayload {
	userId: string;
	sessionId: string;
	deviceId: string; // Should also have device tracking for admin sessions
	isAdmin: true;
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
export type AdminAccessTokenPayload = BaseAdminAccessTokenPayload &
	JwtStandardClaims;
export type RefreshTokenPayload = BaseRefreshTokenPayload & JwtStandardClaims;
export type AdminRefreshTokenPayload = BaseAdminRefreshTokenPayload &
	JwtStandardClaims;
