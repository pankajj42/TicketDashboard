import { JwtService } from "./jwt.service.js";
import { AdminRepository } from "../repositories/admin.repository.js";
import { SessionRepository } from "../repositories/session.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { redis } from "../lib/redis.js";
import config from "../config/env.js";
import crypto from "crypto";
import { Realtime } from "./realtime.service.js";

export class AdminService {
	static adminUserKey(userId: string) {
		return `user:${userId}:admin_elevation`;
	}
	static adminJtiKey(jti: string) {
		return `admin:jti:${jti}`;
	}

	static async elevate(options: {
		userId: string;
		sessionId: string;
		password: string;
		ipAddress?: string;
		userAgent?: string;
	}) {
		// Verify password via hash comparison
		if (!options.password) {
			throw new Error("ADMIN_PASSWORD_REQUIRED");
		}
		// options.password is expected to be SHA-256 hex
		if (options.password !== config.ADMIN_PASSWORD_HASH) {
			throw new Error("ADMIN_PASSWORD_INVALID");
		}

		// Single-session lock: if user has active elevation on another session, block
		const user = await UserRepository.findById(options.userId);
		const now = new Date();
		if (
			user?.adminElevatedUntil &&
			user.adminElevatedUntil > now &&
			user.adminElevatedSessionId &&
			user.adminElevatedSessionId !== options.sessionId
		) {
			throw new Error("ADMIN_ELEVATION_ACTIVE");
		}

		// Create elevation and update pointers atomically
		const jti = crypto.randomUUID();
		const expiresAt = new Date(
			now.getTime() + config.ADMIN_PRIVILEGE_EXPIRY_MINUTES * 60 * 1000
		);
		await AdminRepository.elevateWithTransaction({
			userId: options.userId,
			sessionId: options.sessionId,
			jti,
			expiresAt,
			ipAddress: options.ipAddress,
			userAgent: options.userAgent,
		});

		// Redis allowlist
		const userKey = this.adminUserKey(options.userId);
		const jtiKey = this.adminJtiKey(jti);
		const ttlMs = config.ADMIN_PRIVILEGE_EXPIRY_MINUTES * 60 * 1000;

		await redis.set(
			userKey,
			JSON.stringify({ sessionId: options.sessionId, jti, expiresAt }),
			"PX",
			ttlMs
		);
		await redis.set(
			jtiKey,
			JSON.stringify({
				userId: options.userId,
				sessionId: options.sessionId,
			}),
			"PX",
			ttlMs
		);
		const adminToken = JwtService.generateAdminToken({
			userId: options.userId,
			sessionId: options.sessionId,
			jti,
			scope: "admin:elevated",
		});

		// Track expiry in a sorted set for scheduler-based notifications
		try {
			await redis.zadd(
				"admin:expirations",
				expiresAt.getTime(),
				`${options.userId}:${options.sessionId}`
			);
		} catch (e) {
			console.warn("Failed to add admin expiry to zset", e);
		}

		return { adminToken, expiresAt };
	}

	static async revoke(options: { userId: string; sessionId: string }) {
		// Validate current elevation
		const active = await AdminRepository.findActiveByUserAndSession(
			options.userId,
			options.sessionId
		);
		const user = await UserRepository.findById(options.userId);
		if (!active || !user?.adminElevatedSessionId) {
			throw new Error("ADMIN_ELEVATION_NOT_FOUND");
		}

		// Revoke DB state atomically
		await AdminRepository.revokeWithTransaction({
			userId: options.userId,
			elevationId: active.id,
		});

		// Clear Redis allowlist
		const userKey = this.adminUserKey(options.userId);
		try {
			const data = await redis.get(userKey);
			if (data) {
				const parsed = JSON.parse(data) as { jti?: string };
				if (parsed?.jti) {
					await redis.del(this.adminJtiKey(parsed.jti));
				}
			}
		} finally {
			await redis.del(userKey);
		}

		// Notify current user sessions that admin was revoked
		try {
			Realtime.notifyUser(options.userId, "admin:revoked", {
				sessionId: options.sessionId,
			});
		} catch (e) {
			console.warn("Realtime notify admin:revoked failed", e);
		}

		// Remove from expiry tracking set
		try {
			await redis.zrem(
				"admin:expirations",
				`${options.userId}:${options.sessionId}`
			);
		} catch (e) {
			console.warn("Failed to remove admin expiry from zset", e);
		}

		return { success: true };
	}

	static async isSessionElevated(userId: string, sessionId: string) {
		const user = await UserRepository.findById(userId);
		if (!user?.adminElevatedSessionId || !user.adminElevatedUntil) {
			return false;
		}
		if (user.adminElevatedSessionId !== sessionId) return false;
		return user.adminElevatedUntil > new Date();
	}
}
