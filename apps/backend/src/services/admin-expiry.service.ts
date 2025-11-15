import { redis } from "../lib/redis.js";
import { UserRepository } from "../repositories/user.repository.js";
import { Realtime } from "./realtime.service.js";

export class AdminExpiryWatcher {
	private static timer: NodeJS.Timeout | null = null;
	private static running = false;

	static start(intervalMs: number = 5000) {
		if (this.running) return;
		this.running = true;
		const tick = async () => {
			try {
				const now = Date.now();
				// fetch all expirations due up to now
				const due = await redis.zrangebyscore(
					"admin:expirations",
					0,
					now
				);
				if (due && due.length > 0) {
					for (const member of due) {
						try {
							// remove first to avoid duplicate work across instances
							await redis.zrem("admin:expirations", member);
							const [userId, sessionId] = member.split(":", 2);
							if (!userId || !sessionId) continue;
							const user = await UserRepository.findById(userId);
							// If the user's elevation is still pointing to this session but now expired, emit
							if (
								user?.adminElevatedSessionId === sessionId &&
								user?.adminElevatedUntil &&
								user.adminElevatedUntil.getTime() <= now
							) {
								try {
									Realtime.notifyUser(
										userId,
										"admin:revoked",
										{ sessionId }
									);
								} catch {}
							}
						} catch (e) {
							// swallow to keep loop healthy
							console.warn(
								"admin expiry watcher member error",
								e
							);
						}
					}
				}
			} catch (e) {
				console.warn("admin expiry watcher error", e);
			} finally {
				this.timer = setTimeout(tick, intervalMs);
			}
		};
		// first tick quickly
		this.timer = setTimeout(tick, 1000);
	}

	static stop() {
		if (this.timer) clearTimeout(this.timer);
		this.timer = null;
		this.running = false;
	}
}
