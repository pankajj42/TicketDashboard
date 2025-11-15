import { TicketRepository } from "../repositories/ticket.repository.js";
import { TicketUpdateRepository } from "../repositories/ticket-update.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { ProjectService } from "./project.service.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { redis } from "../lib/redis.js";
import { Realtime } from "./realtime.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { queue } from "./queue.service.js";
import { z } from "zod";
import {
	CreateTicketSchema,
	UpdateTicketDetailsSchema,
	ChangeTicketStatusSchema,
} from "@repo/shared";
import { UpdateType } from "../generated/prisma/client.js";

export class TicketService {
	private static async getUserDisplayName(userId: string | null | undefined) {
		if (!userId) return null;
		try {
			const u = await UserRepository.findById(userId);
			return u?.username || u?.email || null;
		} catch {
			return null;
		}
	}
	static async createTicket(
		projectId: string,
		actorId: string,
		input: z.infer<typeof CreateTicketSchema>
	) {
		const parsed = CreateTicketSchema.parse(input);
		const { ticket, lastUpdateId } = await TicketRepository.createWithAudit(
			projectId,
			actorId,
			parsed.title,
			parsed.description
		);
		// Auto-subscribe creator to the project (idempotent) and notify via realtime
		try {
			await ProjectService.subscribe(projectId, actorId);
		} catch {}
		const meta = await TicketRepository.findProjectMeta(ticket.id);
		const projectName = meta?.projectName || "Project";
		const ticketTitle = meta?.ticketTitle || ticket.title;
		const actorName = (await this.getUserDisplayName(actorId)) || "someone";
		await this.notifyProjectSubscribers(projectId, {
			message: `[${projectName}] Ticket created by ${actorName}: ${ticketTitle}`,
			ticketUpdateId: lastUpdateId,
		});

		Realtime.broadcastToProject(projectId, "ticket:created", {
			ticketId: ticket.id,
			ticketTitle,
			actorId,
			actorName,
		});

		return ticket;
	}

	static async updateTicketDetails(
		ticketId: string,
		actorId: string,
		input: z.infer<typeof UpdateTicketDetailsSchema>
	) {
		const parsed = UpdateTicketDetailsSchema.parse(input);
		const ticket = await TicketRepository.findById(ticketId);
		if (!ticket) throw new Error("TICKET_NOT_FOUND");
		// Allow creator, current assignee, or any subscribed user to update
		if (ticket.createdById !== actorId && ticket.assignedToId !== actorId) {
			const subscribedIds =
				await ProjectRepository.findSubscribedProjectIdsByUser(actorId);
			if (!subscribedIds.includes(ticket.projectId)) {
				throw new Error("FORBIDDEN_NOT_ALLOWED");
			}
		}

		const { ticket: updated, lastUpdateId } =
			await TicketRepository.updateDetailsWithAudit(
				ticketId,
				actorId,
				parsed
			);

		const meta = await TicketRepository.findProjectMeta(ticketId);
		const projectName = meta?.projectName || "Project";
		const ticketTitle = meta?.ticketTitle || updated.title;
		const actorName = (await this.getUserDisplayName(actorId)) || "someone";
		await this.notifyProjectSubscribers(updated.projectId, {
			message: `[${projectName}] Ticket updated by ${actorName}: ${ticketTitle}`,
			ticketUpdateId: lastUpdateId,
		});
		Realtime.broadcastToProject(updated.projectId, "ticket:updated", {
			ticketId: updated.id,
			ticketTitle: updated.title,
			description: updated.description,
			actorId,
			actorName,
		});
		return updated;
	}

	static async changeStatus(
		ticketId: string,
		actorId: string,
		input: z.infer<typeof ChangeTicketStatusSchema>
	) {
		const parsed = ChangeTicketStatusSchema.parse(input);
		const current = await TicketRepository.findById(ticketId);
		if (!current) throw new Error("TICKET_NOT_FOUND");

		const leavingProposed =
			current.status !== "PROPOSED" && parsed.status === "PROPOSED";
		const enteringFromProposed =
			current.status === "PROPOSED" && parsed.status !== "PROPOSED";
		const assignedToId = parsed.status === "PROPOSED" ? null : actorId;

		const { ticket: updated, lastUpdateId } =
			await TicketRepository.changeStatusWithAudit(
				ticketId,
				actorId,
				parsed.status as any,
				assignedToId
			);

		const meta = await TicketRepository.findProjectMeta(ticketId);
		const projectName = meta?.projectName || "Project";
		const ticketTitle = meta?.ticketTitle || current.title;
		const actorName = (await this.getUserDisplayName(actorId)) || "someone";
		await this.notifyProjectSubscribers(updated.projectId, {
			message: `[${projectName}] Status changed by ${actorName} for ${ticketTitle}: ${current.status} → ${parsed.status}`,
			ticketUpdateId: lastUpdateId,
		});
		// If assignment changed implicitly (auto-assign or cleared), send separate notification
		if ((current.assignedToId || null) !== (updated.assignedToId || null)) {
			if (updated.assignedToId) {
				try {
					await ProjectService.subscribe(
						updated.projectId,
						updated.assignedToId
					);
				} catch {}
			}
			const assigneeName = updated.assignedToId
				? (await this.getUserDisplayName(updated.assignedToId)) ||
					"user"
				: null;
			await this.notifyProjectSubscribers(updated.projectId, {
				message: updated.assignedToId
					? `[${projectName}] Assigned to ${assigneeName} by ${actorName}: ${ticketTitle}`
					: `[${projectName}] Assignment cleared by ${actorName}: ${ticketTitle}`,
				ticketUpdateId: lastUpdateId,
			});
			Realtime.broadcastToProject(
				updated.projectId,
				"ticket:assignment",
				{
					ticketId: updated.id,
					assignedToId: updated.assignedToId,
					assignedToName: assigneeName,
					actorName,
					actorId,
					ticketTitle,
				}
			);
		}
		Realtime.broadcastToProject(updated.projectId, "ticket:status", {
			ticketId: updated.id,
			status: updated.status,
			fromStatus: current.status,
			toStatus: updated.status,
			actorId,
			actorName,
			ticketTitle,
		});
		return updated;
	}

	private static async notifyProjectSubscribers(
		projectId: string,
		payload: { message: string; ticketUpdateId?: string | null }
	) {
		const subs = await ProjectRepository.getSubscribers(projectId);
		const notifications = await NotificationRepository.createForRecipients(
			subs.map((s) => ({
				recipientId: s.id,
				message: payload.message,
				ticketUpdateId: payload.ticketUpdateId ?? null,
			}))
		);
		for (let i = 0; i < notifications.length; i++) {
			const n = notifications[i];
			const s = subs[i];
			if (!s || !n) continue;
			const isOnline = await redis.sismember("presence:users", s.id);
			if (!isOnline) {
				await queue.addNotificationJob({
					email: s.email,
					subject: "Ticket Update",
					message: payload.message,
				});
			} else {
				Realtime.notifyUser(s.id, "notification:new", {
					id: n.id,
					message: n.message,
					createdAt: n.createdAt,
					read: n.read,
				});
			}
		}
	}

	static async changeAssignee(
		ticketId: string,
		actorId: string,
		input: { userId?: string | null }
	) {
		const schema = z.object({
			userId: z.string().uuid().nullable().optional(),
		});
		const parsed = schema.parse(input);
		const current = await TicketRepository.findById(ticketId);
		if (!current) throw new Error("TICKET_NOT_FOUND");
		// If unassigning, also move ticket back to PROPOSED to reflect Kanban rules
		if (!parsed.userId && current.status !== "PROPOSED") {
			const { ticket, lastUpdateId } =
				await TicketRepository.changeStatusWithAudit(
					ticketId,
					actorId,
					"PROPOSED" as any,
					null
				);
			const meta = await TicketRepository.findProjectMeta(ticketId);
			const projectName = meta?.projectName || "Project";
			const ticketTitle = meta?.ticketTitle || ticket.title;
			const actorName =
				(await this.getUserDisplayName(actorId)) || "someone";
			await this.notifyProjectSubscribers(ticket.projectId, {
				message: `[${projectName}] Moved to PROPOSED by ${actorName}: ${ticketTitle}`,
				ticketUpdateId: lastUpdateId,
			});
			await this.notifyProjectSubscribers(ticket.projectId, {
				message: `[${projectName}] Assignment cleared by ${actorName}: ${ticketTitle}`,
				ticketUpdateId: lastUpdateId,
			});
			Realtime.broadcastToProject(ticket.projectId, "ticket:status", {
				ticketId: ticket.id,
				status: ticket.status,
				fromStatus: current.status,
				toStatus: ticket.status,
				actorId,
				actorName,
				ticketTitle,
			});
			Realtime.broadcastToProject(ticket.projectId, "ticket:assignment", {
				ticketId: ticket.id,
				assignedToId: null,
				assignedToName: null,
				actorName,
				actorId,
				ticketTitle,
			});
			return ticket;
		}

		const { ticket, lastUpdateId } =
			await TicketRepository.changeAssigneeWithAudit(
				ticketId,
				actorId,
				parsed.userId ?? null
			);
		const meta = await TicketRepository.findProjectMeta(ticketId);
		const projectName = meta?.projectName || "Project";
		const ticketTitle = meta?.ticketTitle || ticket.title;
		const actorName = (await this.getUserDisplayName(actorId)) || "someone";
		const assigneeName = ticket.assignedToId
			? (await this.getUserDisplayName(ticket.assignedToId)) || "user"
			: null;
		await this.notifyProjectSubscribers(ticket.projectId, {
			message: ticket.assignedToId
				? `[${projectName}] Assigned to ${assigneeName} by ${actorName}: ${ticketTitle}`
				: `[${projectName}] Assignment cleared by ${actorName}: ${ticketTitle}`,
			ticketUpdateId: lastUpdateId,
		});
		if (ticket.assignedToId) {
			try {
				await ProjectService.subscribe(
					ticket.projectId,
					ticket.assignedToId
				);
			} catch {}
		}
		Realtime.broadcastToProject(ticket.projectId, "ticket:assignment", {
			ticketId: ticket.id,
			assignedToId: ticket.assignedToId,
			assignedToName: assigneeName,
			actorName,
			actorId,
			ticketTitle,
		});
		return ticket;
	}

	static async changeAssigneeAndStatus(
		ticketId: string,
		actorId: string,
		input: {
			userId?: string | null;
			status?: z.infer<typeof ChangeTicketStatusSchema>["status"];
		}
	) {
		const schema = z.object({
			userId: z.string().uuid().nullable().optional(),
			status: ChangeTicketStatusSchema.shape.status.optional(),
		});
		const parsed = schema.parse(input);
		const current = await TicketRepository.findById(ticketId);
		if (!current) throw new Error("TICKET_NOT_FOUND");
		const { ticket, lastUpdateId } =
			await TicketRepository.updateAssigneeAndStatusWithAudit(
				ticketId,
				actorId,
				{
					newAssignedToId:
						typeof parsed.userId === "undefined"
							? undefined
							: (parsed.userId ?? null),
					newStatus: parsed.status as any,
				}
			);
		const meta = await TicketRepository.findProjectMeta(ticketId);
		const projectName = meta?.projectName || "Project";
		const ticketTitle = meta?.ticketTitle || ticket.title;
		const actorName = (await this.getUserDisplayName(actorId)) || "someone";
		await this.notifyProjectSubscribers(ticket.projectId, {
			message: `[${projectName}] Ticket updated by ${actorName}: ${ticketTitle}`,
			ticketUpdateId: lastUpdateId,
		});
		if (
			typeof parsed.status !== "undefined" &&
			parsed.status !== current.status
		) {
			await this.notifyProjectSubscribers(ticket.projectId, {
				message: `[${projectName}] Status changed by ${actorName} for ${ticketTitle}: ${current.status} → ${parsed.status}`,
				ticketUpdateId: lastUpdateId,
			});
			Realtime.broadcastToProject(ticket.projectId, "ticket:status", {
				ticketId: ticket.id,
				status: ticket.status,
				fromStatus: current.status,
				toStatus: ticket.status,
				actorId,
				actorName,
				ticketTitle,
			});
		}
		if (
			typeof parsed.userId !== "undefined" &&
			(current.assignedToId || null) !== (ticket.assignedToId || null)
		) {
			const assigneeName = ticket.assignedToId
				? (await this.getUserDisplayName(ticket.assignedToId)) || "user"
				: null;
			await this.notifyProjectSubscribers(ticket.projectId, {
				message: ticket.assignedToId
					? `[${projectName}] Assigned to ${assigneeName} by ${actorName}: ${ticketTitle}`
					: `[${projectName}] Assignment cleared by ${actorName}: ${ticketTitle}`,
				ticketUpdateId: lastUpdateId,
			});
			if (ticket.assignedToId) {
				try {
					await ProjectService.subscribe(
						ticket.projectId,
						ticket.assignedToId
					);
				} catch {}
			}
			Realtime.broadcastToProject(ticket.projectId, "ticket:assignment", {
				ticketId: ticket.id,
				assignedToId: ticket.assignedToId,
				assignedToName: assigneeName,
				actorName,
				actorId,
				ticketTitle,
			});
		}
		return ticket;
	}

	// removed prisma usage; using TicketUpdateRepository instead
}
