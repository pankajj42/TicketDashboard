import { ERROR_CODES } from "@repo/shared";
import { ERROR_MESSAGES } from "./constants";

type Details = { [key: string]: unknown } | undefined;

/**
 * Map server error codes to friendly UI messages.
 * Optionally incorporates details (e.g., attemptsRemaining).
 */
export function getFriendlyErrorMessage(
	code?: string,
	fallback?: string,
	details?: Details
): string {
	switch (code) {
		// Auth/session
		case ERROR_CODES.NOT_AUTHENTICATED:
		case ERROR_CODES.MISSING_TOKEN:
		case ERROR_CODES.INVALID_TOKEN:
		case ERROR_CODES.TOKEN_EXPIRED:
		case ERROR_CODES.INVALID_REFRESH_TOKEN:
			return ERROR_MESSAGES.UNAUTHORIZED;

		// Validation & generic
		case ERROR_CODES.VALIDATION_ERROR:
			return ERROR_MESSAGES.VALIDATION_ERROR;

		// OTP & rate limits
		case ERROR_CODES.RATE_LIMITED:
		case ERROR_CODES.RATE_LIMIT_EXCEEDED:
			return ERROR_MESSAGES.RATE_LIMITED;
		case ERROR_CODES.OTP_EXPIRED:
			return ERROR_MESSAGES.OTP_EXPIRED;
		case ERROR_CODES.OTP_ATTEMPTS_EXCEEDED:
			return ERROR_MESSAGES.ACCOUNT_LOCKED;
		case ERROR_CODES.OTP_INVALID: {
			const remaining = (details as any)?.attemptsRemaining;
			if (typeof remaining === "number") {
				return `${ERROR_MESSAGES.INVALID_OTP}. ${remaining} attempts remaining.`;
			}
			return ERROR_MESSAGES.INVALID_OTP;
		}

		// Profile/update
		case ERROR_CODES.USERNAME_EXISTS:
			return "This username is already taken.";
		case ERROR_CODES.UPDATE_FAILED:
			return "Could not update profile. Try again.";

		// Admin elevation
		case ERROR_CODES.ADMIN_PASSWORD_REQUIRED:
			return "Please enter the admin password.";
		case ERROR_CODES.ADMIN_PASSWORD_INVALID:
			return "Incorrect admin password.";
		case ERROR_CODES.ADMIN_ELEVATION_ACTIVE:
			return "Admin elevation is active on another device. Revoke it there first.";
		case ERROR_CODES.ADMIN_TOKEN_INVALID:
		case ERROR_CODES.ADMIN_TOKEN_EXPIRED:
			return "Your admin access has expired. Elevate again if needed.";

		default:
			return fallback || ERROR_MESSAGES.SERVER_ERROR;
	}
}
