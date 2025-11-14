// Timing-related response helpers and types

export interface AuthTimingInfo {
	expiresAt: string; // ISO timestamp
	expiresIn: number; // seconds remaining
	issuedAt: string; // ISO timestamp
}

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
