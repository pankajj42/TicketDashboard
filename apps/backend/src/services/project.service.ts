import { ProjectRepository } from "../repositories/project.repository.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { redis } from "../lib/redis.js";
import { Realtime } from "./realtime.service.js";
import { z } from "zod";
import { CreateProjectSchema } from "@repo/shared";
import { queue } from "./queue.service.js";
import { UserRepository } from "../repositories/user.repository.js";

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

		const message = `New project created: ${project.name}`;
		await NotificationRepository.createMany(
			users.map((u) => ({
				recipientId: u.id,
				message,
				projectCreatedId: project.id,
			}))
		);

		// Realtime broadcast to global room
		Realtime.broadcastGlobal("project:created", { project });

		// Email to offline users via outbox queue
		for (const u of users) {
			const isOnline = await redis.sismember("presence:users", u.id);
			if (!isOnline) {
				await queue.addNotificationJob({
					email: u.email,
					subject: "New Project Created",
					message: `Project ${project.name} has been created.`,
				});
			}
		}

		return project;
	}

	static async listProjects(userId?: string) {
		if (!userId) return ProjectRepository.findAll();
		return ProjectRepository.listWithSubscriptionFlag(userId);
	}

	static async subscribe(projectId: string, userId: string) {
		await ProjectRepository.subscribe(projectId, userId);
		Realtime.notifyUser(userId, "project:subscribed", { projectId });
	}

	static async unsubscribe(projectId: string, userId: string) {
		await ProjectRepository.unsubscribe(projectId, userId);
		Realtime.notifyUser(userId, "project:unsubscribed", { projectId });
	}
}
