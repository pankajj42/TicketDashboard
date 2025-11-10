import {
	OTP_CONFIG,
	API_CONFIG as SHARED_API_CONFIG,
	SESSION_CONFIG,
} from "@repo/shared";

// API Configuration (frontend-specific overrides)
export const API_CONFIG = {
	BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3000",
	PREFIX: "/api/auth",
	TIMEOUT: SHARED_API_CONFIG.TIMEOUT_MS,
} as const;

// Authentication Constants (from shared config)
export const AUTH_CONFIG = {
	OTP_LENGTH: OTP_CONFIG.LENGTH,
	OTP_EXPIRY_MINUTES: OTP_CONFIG.EXPIRY_MINUTES,
	OTP_RESEND_COOLDOWN_SECONDS: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
	TOKEN_REFRESH_THRESHOLD:
		SESSION_CONFIG.TOKEN_REFRESH_THRESHOLD_MINUTES * 60 * 1000, // Convert to ms
	MAX_RETRY_ATTEMPTS: SHARED_API_CONFIG.MAX_RETRY_ATTEMPTS,
} as const;

// Route Constants
export const ROUTES = {
	LOGIN: "/login",
	DASHBOARD: "/dashboard",
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
	AUTH: "auth-storage",
	THEME: "ticketdash-ui-theme",
} as const;

// Error Messages
export const ERROR_MESSAGES = {
	NETWORK: "Network error. Please check your connection.",
	UNAUTHORIZED: "Your session has expired. Please login again.",
	FORBIDDEN: "You do not have permission to perform this action.",
	SERVER_ERROR: "An unexpected server error occurred.",
	VALIDATION_ERROR: "Please check your input and try again.",
	EMAIL_REQUIRED: "Email is required",
	INVALID_OTP: `Please enter a valid ${AUTH_CONFIG.OTP_LENGTH}-digit OTP`,
	OTP_EXPIRED: "Your OTP has expired. Please request a new one.",
	RATE_LIMITED: "Too many attempts. Please wait before trying again.",
	ACCOUNT_LOCKED:
		"Account temporarily locked due to too many failed attempts.",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
	OTP_SENT: "Check your email for the verification code",
	LOGIN_SUCCESS: "Successfully logged in!",
	LOGOUT_SUCCESS: "Successfully logged out",
	LOGOUT_ALL_SUCCESS: "Successfully logged out from all devices",
} as const;
