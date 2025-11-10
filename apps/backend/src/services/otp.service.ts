import { redis } from "../lib/redis.js";
import { queue } from "./queue.service.js";
import config from "../config/env.js";
import crypto from "crypto";
import { createOtpTiming, type OtpResponse } from "@repo/shared";

interface OtpData {
	code: string;
	email: string;
	attempts: number;
	createdAt: number;
	otpId: string; // Unique identifier for this OTP
}

export class OtpService {
	/**
	 * Generate a 6-digit OTP code
	 */
	private static generateOtpCode(): string {
		return crypto.randomInt(100000, 999999).toString();
	}

	// Generate and send OTP with timing information
	static async generateAndSendOtp(email: string): Promise<OtpResponse> {
		try {
			const now = new Date();
			const otpId = crypto.randomUUID();

			// Check for existing valid OTP (rate limiting)
			const existingOtp = await this.getOtpFromRedis(email);
			if (existingOtp) {
				const otpData: OtpData = JSON.parse(existingOtp);
				const timeSinceCreation = Date.now() - otpData.createdAt;
				const rateLimitMs =
					config.OTP_REREQUEST_RATE_LIMIT_SECONDS * 1000;

				if (timeSinceCreation < rateLimitMs) {
					// Return existing OTP timing info for rate limiting
					const otpExpiryDate = new Date(
						otpData.createdAt +
							config.OTP_EXPIRY_MINUTES * 60 * 1000
					);
					const resendAllowedDate = new Date(
						otpData.createdAt + rateLimitMs
					);

					return {
						success: false,
						message: `Please wait before requesting a new OTP`,
						code: "RATE_LIMITED",
						data: {
							otpId: otpData.otpId,
							...createOtpTiming(
								otpExpiryDate,
								resendAllowedDate
							),
							config: {
								length: config.OTP_LENGTH,
								maxAttempts: config.OTP_VERIFY_ATTEMPTS_LIMIT,
								attemptsRemaining:
									config.OTP_VERIFY_ATTEMPTS_LIMIT -
									otpData.attempts,
							},
						},
					};
				}
			}

			// Generate OTP code
			const otpCode = this.generateOtpCode();

			// Calculate expiry dates
			const otpExpiryDate = new Date(
				now.getTime() + config.OTP_EXPIRY_MINUTES * 60 * 1000
			);
			const resendAllowedDate = new Date(
				now.getTime() + config.OTP_REREQUEST_RATE_LIMIT_SECONDS * 1000
			);

			// Store OTP in Redis with configured expiration
			const otpData: OtpData = {
				code: otpCode,
				email,
				attempts: 0,
				createdAt: now.getTime(),
				otpId,
			};

			await redis.setex(
				`otp:${email}`,
				config.OTP_EXPIRY_MINUTES * 60, // Convert minutes to seconds
				JSON.stringify(otpData)
			);

			// Queue OTP email for sending
			await queue.addOtpJob({ email, otp: otpCode });

			return {
				success: true,
				message: "OTP sent successfully",
				code: "OTP_SENT",
				data: {
					otpId,
					...createOtpTiming(otpExpiryDate, resendAllowedDate),
					config: {
						length: config.OTP_LENGTH,
						maxAttempts: config.OTP_VERIFY_ATTEMPTS_LIMIT,
						attemptsRemaining: config.OTP_VERIFY_ATTEMPTS_LIMIT,
					},
				},
			};
		} catch (error) {
			console.error("Error generating OTP:", error);
			throw new Error("Failed to generate OTP");
		}
	}

	// Verify OTP with enhanced error information
	static async verifyOtp(
		email: string,
		code: string
	): Promise<{
		success: boolean;
		message?: string;
		code?: string;
		attemptsRemaining?: number;
	}> {
		try {
			// Get OTP from Redis
			const otpDataStr = await this.getOtpFromRedis(email);
			if (!otpDataStr) {
				return {
					success: false,
					message: "Invalid or expired OTP",
					code: "OTP_EXPIRED",
				};
			}

			const otpData: OtpData = JSON.parse(otpDataStr);

			// Check attempt limits
			if (otpData.attempts >= config.OTP_VERIFY_ATTEMPTS_LIMIT) {
				// Remove OTP to prevent further attempts
				await redis.del(`otp:${email}`);
				return {
					success: false,
					message:
						"Too many failed attempts. Please request a new OTP",
					code: "OTP_ATTEMPTS_EXCEEDED",
					attemptsRemaining: 0,
				};
			}

			// Check if OTP matches
			if (otpData.code !== code) {
				// Increment attempts
				otpData.attempts += 1;
				const attemptsRemaining =
					config.OTP_VERIFY_ATTEMPTS_LIMIT - otpData.attempts;

				// Get remaining TTL to preserve original expiration
				const remainingTtl = await redis.ttl(`otp:${email}`);

				if (remainingTtl > 0) {
					// Keep original expiration by using remaining TTL
					await redis.setex(
						`otp:${email}`,
						remainingTtl,
						JSON.stringify(otpData)
					);
				} else {
					// TTL is -1 (no expiration) or -2 (key doesn't exist) - OTP has expired
					await redis.del(`otp:${email}`);
				}

				return {
					success: false,
					message: `Invalid OTP. ${attemptsRemaining} attempts remaining`,
					code: "OTP_INVALID",
					attemptsRemaining,
				};
			}

			// OTP is valid, remove it from Redis
			await redis.del(`otp:${email}`);

			return {
				success: true,
				code: "OTP_VERIFIED",
			};
		} catch (error) {
			console.error("Error verifying OTP:", error);
			throw new Error("Failed to verify OTP");
		}
	}

	// Helper: Get OTP from Redis
	private static async getOtpFromRedis(
		email: string
	): Promise<string | null> {
		return await redis.get(`otp:${email}`);
	}
}
