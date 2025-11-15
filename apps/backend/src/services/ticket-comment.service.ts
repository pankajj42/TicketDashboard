import { ProjectRepository } from "../repositories/project.repository.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { queue } from "./queue.service.js";
import { redis } from "../lib/redis.js";
import { Realtime } from "./realtime.service.js";
import { TicketCommentRepository } from "../repositories/ticket-comment.repository.js";
import { TicketRepository } from "../repositories/ticket.repository.js";
import { UserRepository } from "../repositories/user.repository.js";

export class TicketCommentService {
	static async addComment(ticketId: string, userId: string, body: string) {
		const result = await TicketCommentRepository.createWithAudit(
			ticketId,
			userId,
			body
		);

		// Notify project subscribers
		const t = await TicketRepository.findProjectMeta(ticketId);
		if (t) {
			const subs = await ProjectRepository.getSubscribers(t.projectId);
			// Include actor and snippet in message
			let actorName = "someone";
			try {
				const u = await UserRepository.findById(userId);
				actorName = u?.username || u?.email || "someone";
			} catch {}
			const snippet = body.slice(0, 140);
			const message = `Comment by ${actorName} on ${t.title}: ${snippet}`;
			await NotificationRepository.createMany(
				subs.map((s) => ({
					recipientId: s.id,
					message,
					ticketUpdateId: result.updateId,
				}))
			);
			for (const s of subs) {
				const isOnline = await redis.sismember("presence:users", s.id);
				if (!isOnline) {
					await queue.addNotificationJob({
						email: s.email,
						subject: `New Comment by ${actorName}`,
						message,
					});
				} else {
					Realtime.notifyUser(s.id, "notification:new", { message });
				}
			}
			Realtime.broadcastToProject(t.projectId, "ticket:comment", {
				ticketId,
				commentId: result.comment.id,
				body,
				actorId: userId,
				actorName,
				createdAt: result.comment.createdAt,
				ticketTitle: t.title,
			});
		}
		return result.comment;
	}
}
