import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createServer } from "http";
import { redis } from "../lib/redis.js";
import { JwtService } from "./jwt.service.js";
import { SessionService } from "./session.service.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import config from "../config/env.js";

type AuthedSocket = import("socket.io").Socket & { userId?: string };

export class Realtime {
	private static io: Server | null = null;

	static attach(app: import("express").Express, port: number) {
		const httpServer = createServer(app);
		const pub = redis.duplicate();
		const sub = redis.duplicate();
		const io = new Server(httpServer, {
			cors: {
				origin:
					config.ALLOWED_ORIGINS && config.ALLOWED_ORIGINS.length > 0
						? config.ALLOWED_ORIGINS
						: config.isDevelopment
							? "http://localhost:5173"
							: [],
				credentials: true,
			},
		});
		io.adapter(createAdapter(pub as any, sub as any));

		io.use(async (socket, next) => {
			try {
				const token =
					(socket.handshake.auth as any)?.token ||
					(
						socket.handshake.headers["authorization"] as
							| string
							| undefined
					)?.replace("Bearer ", "");
				if (!token) return next(new Error("UNAUTHORIZED"));
				const payload = await SessionService.validateSession(token);
				if (!payload) return next(new Error("UNAUTHORIZED"));
				(socket as AuthedSocket).userId = payload.userId;
				return next();
			} catch (e) {
				return next(new Error("UNAUTHORIZED"));
			}
		});

		io.on("connection", async (socket: AuthedSocket) => {
			const userId = socket.userId!;
			// presence counters
			const countKey = `presence:user:${userId}:count`;
			await redis.incr(countKey);
			await redis.sadd("presence:users", userId);
			await redis.expire(countKey, 300);

			socket.join(`user:${userId}`);

			// Server-side bootstrap: auto-join all subscribed project rooms
			try {
				const ids =
					await ProjectRepository.findSubscribedProjectIdsByUser(
						userId
					);
				for (const id of ids) {
					socket.join(`project:${id}`);
				}
			} catch (e) {
				// swallow — realtime bootstrapping failure shouldn't break connection
			}

			socket.on("subscribe", (projectId: string) => {
				socket.join(`project:${projectId}`);
			});
			socket.on("unsubscribe", (projectId: string) => {
				socket.leave(`project:${projectId}`);
			});

			socket.on("disconnect", async () => {
				const n = await redis.decr(countKey);
				if (n <= 0) {
					await redis.srem("presence:users", userId);
					await redis.del(countKey);
				}
			});
		});

		httpServer.listen(port, () => {
			// Attach only once
		});

		this.io = io;
	}

	static broadcastGlobal(event: string, payload: any) {
		this.io?.emit(event, payload);
	}

	static broadcastToProject(projectId: string, event: string, payload: any) {
		this.io?.to(`project:${projectId}`).emit(event, payload);
	}

	static notifyUser(userId: string, event: string, payload: any) {
		this.io?.to(`user:${userId}`).emit(event, payload);
	}

	// Ensure all sockets for a given user join a project's room (cluster-safe)
	static joinUserToProjectRoom(userId: string, projectId: string) {
		const room = `project:${projectId}`;
		this.io?.in(`user:${userId}`).socketsJoin(room);
	}

	// Ensure all sockets for a given user leave a project's room (cluster-safe)
	static leaveUserFromProjectRoom(userId: string, projectId: string) {
		const room = `project:${projectId}`;
		this.io?.in(`user:${userId}`).socketsLeave(room);
	}
}
