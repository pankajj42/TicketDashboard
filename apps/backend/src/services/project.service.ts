import { ProjectRepository } from "../repositories/project.repository.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { redis } from "../lib/redis.js";
import { Realtime } from "./realtime.service.js";
import { z } from "zod";
import { CreateProjectSchema } from "@repo/shared";
import { queue } from "./queue.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { Prisma } from "../generated/prisma/client.js";
import { TicketRepository } from "../repositories/ticket.repository.js";

export class ProjectService {
	static async createProject(
		actorId: string,
		input: z.infer<typeof CreateProjectSchema>
	) {
		const parsed = CreateProjectSchema.parse(input);
		const project = await ProjectRepository.create({
			name: parsed.name,
			description: parsed.description ?? null,
		});

		// Notify all users (project creation is global)
		const users = await UserRepository.findAllActiveLite();
		const actor = await UserRepository.findById(actorId);
		const actorName = actor?.username || actor?.email || "someone";
		const message = `New project created by ${actorName}: ${project.name}`;
		const notifications = await NotificationRepository.createForRecipients(
			users.map((u) => ({
				recipientId: u.id,
				message,
				projectCreatedId: project.id,
			}))
		);

		// Realtime broadcast to global room for project list updates (include initial subscriberCount)
		Realtime.broadcastGlobal("project:created", {
			project,
			actorId,
			actorName,
			subscriberCount: 0,
		});

		// Realtime notify online users for notifications; email offline users
		for (let i = 0; i < users.length; i++) {
			const u = users[i];
			const n = notifications[i];
			if (!u || !n) continue;
			const isOnline = await redis.sismember("presence:users", u.id);
			if (!isOnline) {
				await queue.addNotificationJob({
					email: u.email,
					subject: "New Project Created",
					message: `Project ${project.name} has been created.`,
				});
			} else {
				Realtime.notifyUser(u.id, "notification:new", {
					id: n.id,
					message: n.message,
					createdAt: n.createdAt,
					read: n.read,
				});
			}
		}

		return project;
	}

	static async listProjects(userId?: string) {
		if (!userId) return ProjectRepository.findAll();
		return ProjectRepository.listWithSubscriptionFlag(userId);
	}

	static async getById(projectId: string) {
		return ProjectRepository.findById(projectId);
	}

	static async getSubscribers(projectId: string) {
		return ProjectRepository.getSubscribers(projectId);
	}

	static async subscribe(projectId: string, userId: string) {
		// Idempotent: if already subscribed, ensure socket joins room but do not emit duplicate events
		const already =
			await ProjectRepository.findSubscribedProjectIdsByUser(userId);
		if (!already.includes(projectId)) {
			await ProjectRepository.subscribe(projectId, userId);
			Realtime.notifyUser(userId, "project:subscribed", { projectId });
		}
		// Also broadcast globally with authoritative subscriber count
		const subscriberCount =
			await ProjectRepository.countSubscribers(projectId);
		// Ensure all the user's sockets join the room (server-authoritative)
		Realtime.joinUserToProjectRoom(userId, projectId);
		// Only broadcast membership if a new subscription happened
		if (!already.includes(projectId)) {
			Realtime.broadcastGlobal("project:member:subscribed", {
				projectId,
				userId,
				subscriberCount,
			});
		}
	}

	static async unsubscribe(projectId: string, userId: string) {
		// Idempotent: skip if not subscribed
		const exists =
			await ProjectRepository.findSubscribedProjectIdsByUser(userId);
		if (!exists.includes(projectId)) return;
		// Prevent unsubscribe if user has created or assigned tickets in this project
		const hasTickets = await TicketRepository.hasUserTicketsInProject(
			projectId,
			userId
		);
		if (hasTickets) {
			const err: any = new Error(
				"Cannot unsubscribe: you have tickets in this project"
			);
			err.status = 400;
			err.code = "CANNOT_UNSUBSCRIBE_HAS_TICKETS";
			throw err;
		}
		await ProjectRepository.unsubscribe(projectId, userId);
		Realtime.notifyUser(userId, "project:unsubscribed", { projectId });
		const subscriberCount =
			await ProjectRepository.countSubscribers(projectId);
		// Ensure all the user's sockets leave the room (server-authoritative)
		Realtime.leaveUserFromProjectRoom(userId, projectId);
		Realtime.broadcastGlobal("project:member:unsubscribed", {
			projectId,
			userId,
			subscriberCount,
		});
	}

	static async updateProject(
		actorId: string,
		projectId: string,
		input: { name?: string; description?: string | null }
	) {
		const current = await ProjectRepository.findById(projectId);
		if (!current) throw new Error("PROJECT_NOT_FOUND");
		const nextData: { name?: string; description?: string | null } = {};
		if (typeof input.name !== "undefined" && input.name !== current.name) {
			nextData.name = input.name;
		}
		if (
			typeof input.description !== "undefined" &&
			input.description !== (current.description ?? null)
		) {
			nextData.description = input.description ?? null;
		}
		// If no effective changes, return current without notifying
		if (Object.keys(nextData).length === 0) return current;

		const updated = await ProjectRepository.update(projectId, nextData);

		// Notify everyone
		const users = await UserRepository.findAllActiveLite();
		const actor = await UserRepository.findById(actorId);
		const actorName = actor?.username || actor?.email || "someone";
		const message = `Project updated by ${actorName}: ${updated.name}`;
		const notifications = await NotificationRepository.createForRecipients(
			users.map((u) => ({
				recipientId: u.id,
				message,
				projectCreatedId: updated.id,
			}))
		);
		Realtime.broadcastGlobal("project:updated", {
			project: updated,
			actorId,
			actorName,
		});
		for (let i = 0; i < users.length; i++) {
			const u = users[i];
			const n = notifications[i];
			if (!u || !n) continue;
			const isOnline = await redis.sismember("presence:users", u.id);
			if (!isOnline) {
				await queue.addNotificationJob({
					email: u.email,
					subject: "Project Updated",
					message: `Project ${updated.name} has been updated.`,
				});
			} else {
				Realtime.notifyUser(u.id, "notification:new", {
					id: n.id,
					message: n.message,
					createdAt: n.createdAt,
					read: n.read,
				});
			}
		}
		return updated;
	}
}
