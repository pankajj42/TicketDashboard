import { z } from "zod";

// Auth validation schemas
export const LoginSchema = z.object({
	email: z.string().email("Invalid email format"),
});

// Factory function for creating OTP schema with configurable length
export const createVerifyOtpSchema = (otpLength: number = 6) =>
	z.object({
		email: z.string().email("Invalid email format"),
		otp: z
			.string()
			.length(otpLength, `OTP must be ${otpLength} digits`)
			.regex(/^\d+$/, "OTP must contain only numbers"),
		deviceInfo: z.object({
			userAgent: z.string().min(1, "User agent required"),
			deviceName: z.string().optional(),
		}),
	});

// Default export for backward compatibility
export const VerifyOtpSchema = createVerifyOtpSchema(6);

export const LogoutSchema = z.object({
	logoutAll: z.boolean().optional().default(false),
});

export const LogoutDeviceSchema = z.object({
	sessionId: z.string().uuid("Invalid session ID"),
});

export const UpdateProfileSchema = z.object({
	username: z
		.string()
		.min(3, "Username must be at least 3 characters")
		.max(50, "Username cannot exceed 50 characters"),
});
