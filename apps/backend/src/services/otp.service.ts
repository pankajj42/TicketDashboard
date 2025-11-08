import { UserRepository } from "../repositories/user.repository.js";
import { redis } from "../lib/redis.js";
import { queue } from "./queue.service.js";
import config from "../config/env.js";
import crypto from "crypto";

export class OtpService {
	/**
	 * Generate a 6-digit OTP code
	 */
	private static generateOtpCode(): string {
		return crypto.randomInt(100000, 999999).toString();
	}

	// Generate and send OTP
	static async generateAndSendOtp(
		email: string
	): Promise<{ success: boolean; message: string }> {
		try {
			// Check for existing valid OTP (rate limiting)
			const existingOtp = await this.getOtpFromRedis(email);
			if (existingOtp) {
				const otpData = JSON.parse(existingOtp);
				const timeSinceCreation = Date.now() - otpData.createdAt;
				const rateLimitMs = config.OTP_RATE_LIMIT_SECONDS * 1000;

				if (timeSinceCreation < rateLimitMs) {
					return {
						success: false,
						message: `Please wait ${Math.ceil((rateLimitMs - timeSinceCreation) / 1000)} seconds before requesting a new OTP`,
					};
				}
			}

			// Generate 6-digit OTP
			const otpCode = this.generateOtpCode();

			// Store OTP in Redis with configured expiration
			const otpData = {
				code: otpCode,
				email,
				attempts: 0,
				createdAt: Date.now(),
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
			};
		} catch (error) {
			console.error("Error generating OTP:", error);
			throw new Error("Failed to generate OTP");
		}
	}

	// Verify OTP (simplified - no user creation)
	static async verifyOtp(
		email: string,
		code: string
	): Promise<{
		success: boolean;
		message?: string;
	}> {
		try {
			// Get OTP from Redis
			const otpDataStr = await this.getOtpFromRedis(email);
			if (!otpDataStr) {
				return {
					success: false,
					message: "Invalid or expired OTP",
				};
			}

			const otpData = JSON.parse(otpDataStr);

			// Check attempt limits
			if (otpData.attempts >= 3) {
				// Remove OTP to prevent further attempts
				await redis.del(`otp:${email}`);
				return {
					success: false,
					message:
						"Too many failed attempts. Please request a new OTP",
				};
			}

			// Check if OTP matches
			if (otpData.code !== code) {
				// Increment attempts
				otpData.attempts += 1;

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
					message: "Invalid or expired OTP",
				};
			}

			// OTP is valid, remove it from Redis
			await redis.del(`otp:${email}`);

			return {
				success: true,
			};
		} catch (error) {
			console.error("Error verifying OTP:", error);
			throw new Error("Failed to verify OTP");
		}
	} // Helper: Get OTP from Redis
	private static async getOtpFromRedis(
		email: string
	): Promise<string | null> {
		return await redis.get(`otp:${email}`);
	}
}
