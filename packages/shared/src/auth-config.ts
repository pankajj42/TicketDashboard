/**
 * SHARED AUTHENTICATION CONFIGURATION
 *
 * This file contains all authentication-related constants that should be
 * consistent between frontend and backend applications.
 *
 * Following DRY principles: Single source of truth for auth configuration.
 */

// OTP Configuration
export const OTP_CONFIG = {
	LENGTH: 6,
	EXPIRY_MINUTES: 5,
	RESEND_COOLDOWN_SECONDS: 60,
	MAX_VERIFY_ATTEMPTS: 5,
} as const;

// User Authentication Limits
export const USER_AUTH_CONFIG = {
	MAX_LOGIN_ATTEMPTS: 5,
	RATE_LIMIT_SECONDS: 60,
	LOCKOUT_DURATION_MINUTES: 15,
} as const;

// Session Configuration
export const SESSION_CONFIG = {
	ACCESS_TOKEN_EXPIRY_MINUTES: 15,
	REFRESH_TOKEN_EXPIRY_DAYS: 7,
	ADMIN_TOKEN_EXPIRY_MINUTES: 30,
	TOKEN_REFRESH_THRESHOLD_MINUTES: 5,
	MAX_CONCURRENT_SESSIONS: 10,
} as const;

// API Configuration
export const API_CONFIG = {
	TIMEOUT_MS: 30000, // 30 seconds
	MAX_RETRY_ATTEMPTS: 3,
	RETRY_DELAY_MS: 1000,
} as const;

// Validation Limits
export const VALIDATION_CONFIG = {
	EMAIL_MAX_LENGTH: 255,
	USERNAME_MIN_LENGTH: 3,
	USERNAME_MAX_LENGTH: 50,
	DEVICE_NAME_MAX_LENGTH: 100,
} as const;

// Error Codes (shared between frontend and backend)
export const AUTH_ERROR_CODES = {
	INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
	OTP_EXPIRED: "AUTH_OTP_EXPIRED",
	OTP_INVALID: "AUTH_OTP_INVALID",
	OTP_ATTEMPTS_EXCEEDED: "AUTH_OTP_ATTEMPTS_EXCEEDED",
	RATE_LIMITED: "AUTH_RATE_LIMITED",
	ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
	SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
	INSUFFICIENT_PERMISSIONS: "AUTH_INSUFFICIENT_PERMISSIONS",
} as const;

// Success Codes (for consistent messaging)
export const AUTH_SUCCESS_CODES = {
	OTP_SENT: "AUTH_OTP_SENT",
	LOGIN_SUCCESS: "AUTH_LOGIN_SUCCESS",
	LOGOUT_SUCCESS: "AUTH_LOGOUT_SUCCESS",
	LOGOUT_ALL_SUCCESS: "AUTH_LOGOUT_ALL_SUCCESS",
} as const;

// Response Types with Timing Information
export interface OtpResponse {
	success: boolean;
	message: string;
	code?: string;
	data?: {
		otpId: string;
		expiresAt: string; // ISO timestamp
		expiresIn: number; // seconds remaining
		canResendAt: string; // ISO timestamp
		canResendIn: number; // seconds remaining
		config: {
			length: number;
			maxAttempts: number;
			attemptsRemaining: number;
		};
	};
}

export interface AuthTimingInfo {
	expiresAt: string; // ISO timestamp
	expiresIn: number; // seconds remaining
	issuedAt: string; // ISO timestamp
}

export interface LoginResponse {
	success: boolean;
	message: string;
	code?: string;
	data?: {
		otpSent: boolean;
		timing?: AuthTimingInfo;
	};
}

export interface VerifyOtpResponse {
	success: boolean;
	message?: string;
	code?: string;
	data?: {
		user: {
			id: string;
			email: string;
			username: string;
		};
		accessToken: string;
		timing: {
			accessToken: AuthTimingInfo;
			refreshToken: AuthTimingInfo;
		};
		isNewUser?: boolean;
	};
}

// Utility Functions for Time Calculations
export const createTimingInfo = (expiryDate: Date): AuthTimingInfo => {
	const now = new Date();
	const expiresIn = Math.max(
		0,
		Math.floor((expiryDate.getTime() - now.getTime()) / 1000)
	);

	return {
		expiresAt: expiryDate.toISOString(),
		expiresIn,
		issuedAt: now.toISOString(),
	};
};

export const createOtpTiming = (
	otpExpiryDate: Date,
	resendAllowedDate: Date
) => {
	const now = new Date();

	return {
		expiresAt: otpExpiryDate.toISOString(),
		expiresIn: Math.max(
			0,
			Math.floor((otpExpiryDate.getTime() - now.getTime()) / 1000)
		),
		canResendAt: resendAllowedDate.toISOString(),
		canResendIn: Math.max(
			0,
			Math.floor((resendAllowedDate.getTime() - now.getTime()) / 1000)
		),
	};
};

// Type Guards
export const isAuthError = (
	response: any
): response is { error: string; code?: string } => {
	return response && typeof response.error === "string";
};

export const isAuthSuccess = (response: any): response is { success: true } => {
	return response && response.success === true;
};
