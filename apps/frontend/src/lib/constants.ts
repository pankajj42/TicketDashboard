// API Configuration
export const API_CONFIG = {
	BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3000",
	PREFIX: "/api/auth",
	TIMEOUT: 30000, // 30 seconds
} as const;

// Authentication Constants
export const AUTH_CONFIG = {
	OTP_LENGTH: 6,
	OTP_EXPIRY_MINUTES: 5,
	TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes in ms
	MAX_RETRY_ATTEMPTS: 3,
} as const;

// Route Constants
export const ROUTES = {
	LOGIN: "/login",
	DASHBOARD: "/dashboard",
	HOME: "/",
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
	INVALID_OTP: "Please enter a valid 6-digit OTP",
	OTP_EXPIRED: "Your OTP has expired. Please request a new one.",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
	OTP_SENT: "Check your email for the verification code",
	LOGIN_SUCCESS: "Successfully logged in!",
	LOGOUT_SUCCESS: "Successfully logged out",
	LOGOUT_ALL_SUCCESS: "Successfully logged out from all devices",
} as const;
