import { TicketRepository } from "../repositories/ticket.repository.js";
import { TicketUpdateRepository } from "../repositories/ticket-update.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { redis } from "../lib/redis.js";
import { Realtime } from "./realtime.service.js";
import { queue } from "./queue.service.js";
import { z } from "zod";
import {
	CreateTicketSchema,
	UpdateTicketDetailsSchema,
	ChangeTicketStatusSchema,
} from "@repo/shared";
import { UpdateType } from "../generated/prisma/client.js";

export class TicketService {
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

		await this.notifyProjectSubscribers(projectId, {
			message: `New ticket in project: ${ticket.title}`,
			ticketUpdateId: lastUpdateId,
		});

		Realtime.broadcastToProject(projectId, "ticket:created", {
			ticketId: ticket.id,
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
		if (ticket.createdById !== actorId)
			throw new Error("FORBIDDEN_NOT_CREATOR");

		const { ticket: updated, lastUpdateId } =
			await TicketRepository.updateDetailsWithAudit(
				ticketId,
				actorId,
				parsed
			);

		await this.notifyProjectSubscribers(updated.projectId, {
			message: `Ticket updated: ${updated.title}`,
			ticketUpdateId: lastUpdateId,
		});
		Realtime.broadcastToProject(updated.projectId, "ticket:updated", {
			ticketId: updated.id,
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

		await this.notifyProjectSubscribers(updated.projectId, {
			message: `Ticket status changed: ${current.title} → ${parsed.status}`,
			ticketUpdateId: lastUpdateId,
		});
		Realtime.broadcastToProject(updated.projectId, "ticket:status", {
			ticketId: updated.id,
			status: updated.status,
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
			await this.notifyProjectSubscribers(ticket.projectId, {
				message: `Ticket moved to PROPOSED: ${ticket.title}`,
				ticketUpdateId: lastUpdateId,
			});
			Realtime.broadcastToProject(ticket.projectId, "ticket:status", {
				ticketId: ticket.id,
				status: ticket.status,
			});
			return ticket;
		}

		const { ticket, lastUpdateId } =
			await TicketRepository.changeAssigneeWithAudit(
				ticketId,
				actorId,
				parsed.userId ?? null
			);
		await this.notifyProjectSubscribers(ticket.projectId, {
			message: `Ticket assignment updated: ${ticket.title}`,
			ticketUpdateId: lastUpdateId,
		});
		Realtime.broadcastToProject(ticket.projectId, "ticket:assignment", {
			ticketId: ticket.id,
			assignedToId: ticket.assignedToId,
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
		await this.notifyProjectSubscribers(ticket.projectId, {
			message: `Ticket updated: ${ticket.title}`,
			ticketUpdateId: lastUpdateId,
		});
		if (typeof parsed.status !== "undefined") {
			Realtime.broadcastToProject(ticket.projectId, "ticket:status", {
				ticketId: ticket.id,
				status: ticket.status,
			});
		}
		if (typeof parsed.userId !== "undefined") {
			Realtime.broadcastToProject(ticket.projectId, "ticket:assignment", {
				ticketId: ticket.id,
				assignedToId: ticket.assignedToId,
			});
		}
		return ticket;
	}

	// removed prisma usage; using TicketUpdateRepository instead
}
