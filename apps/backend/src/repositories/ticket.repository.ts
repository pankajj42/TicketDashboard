import type {
	Ticket,
	Prisma,
	TicketStatus,
	UpdateType,
} from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

export class TicketRepository extends BaseRepository {
	static async create(
		projectId: string,
		createdById: string,
		title: string,
		description: string
	): Promise<Ticket> {
		const data: Prisma.TicketCreateInput = {
			title,
			description,
			status: "PROPOSED",
			project: { connect: { id: projectId } },
			createdBy: { connect: { id: createdById } },
		} as unknown as Prisma.TicketCreateInput;
		return super.prisma.ticket.create({ data });
	}

	static async createWithAudit(
		projectId: string,
		createdById: string,
		title: string,
		description: string
	): Promise<{ ticket: Ticket; lastUpdateId: string }> {
		return await super.prisma.$transaction(
			async (tx) => {
				const ticket = await tx.ticket.create({
					data: {
						title,
						description,
						status: "PROPOSED",
						project: { connect: { id: projectId } },
						createdBy: { connect: { id: createdById } },
					},
				});
				const update = await tx.ticketUpdate.create({
					data: {
						ticket: { connect: { id: ticket.id } },
						updatedBy: { connect: { id: createdById } },
						type: "CREATED" as UpdateType,
						content: JSON.stringify({ title }),
					},
				});
				return { ticket, lastUpdateId: update.id };
			},
			{ timeout: 15000 }
		);
	}

	static async findById(id: string): Promise<Ticket | null> {
		return super.prisma.ticket.findUnique({ where: { id } });
	}

	static async findDetailedById(id: string) {
		return super.prisma.ticket.findUnique({
			where: { id },
			include: {
				createdBy: { select: { id: true, username: true } },
				assignedTo: { select: { id: true, username: true } },
			},
		});
	}

	static async listByProject(projectId: string): Promise<Ticket[]> {
		return super.prisma.ticket.findMany({
			where: { projectId },
			orderBy: { createdAt: "desc" },
		});
	}

	static async listByCreator(userId: string) {
		return super.prisma.ticket.findMany({
			where: { createdById: userId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				project: { select: { id: true, name: true } },
				createdAt: true,
			},
		});
	}

	static async listByAssignee(userId: string) {
		return super.prisma.ticket.findMany({
			where: { assignedToId: userId },
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				title: true,
				description: true,
				status: true,
				project: { select: { id: true, name: true } },
				createdAt: true,
			},
		});
	}

	static async updateDetails(
		ticketId: string,
		data: { title?: string; description?: string }
	): Promise<Ticket> {
		return super.prisma.ticket.update({ where: { id: ticketId }, data });
	}

	static async updateDetailsWithAudit(
		ticketId: string,
		actorId: string,
		data: { title?: string; description?: string }
	): Promise<{ ticket: Ticket; lastUpdateId: string }> {
		return await super.prisma.$transaction(
			async (tx) => {
				const current = await tx.ticket.findUnique({
					where: { id: ticketId },
				});
				if (!current) throw new Error("TICKET_NOT_FOUND");
				const ticket = await tx.ticket.update({
					where: { id: ticketId },
					data,
				});
				const content: Record<string, any> = {};
				if (data.title)
					content.title = { prev: current.title, next: data.title };
				if (data.description)
					content.description = {
						prev: current.description,
						next: data.description,
					};
				const update = await tx.ticketUpdate.create({
					data: {
						ticket: { connect: { id: ticketId } },
						updatedBy: { connect: { id: actorId } },
						type: "UPDATED" as UpdateType,
						content: JSON.stringify(content),
					},
				});
				return { ticket, lastUpdateId: update.id };
			},
			{ timeout: 15000 }
		);
	}

	static async changeStatus(
		ticketId: string,
		status: TicketStatus,
		assignedToId: string | null
	): Promise<Ticket> {
		return super.prisma.ticket.update({
			where: { id: ticketId },
			data: {
				status,
				assignedTo: assignedToId
					? { connect: { id: assignedToId } }
					: { disconnect: true },
			},
		});
	}

	static async changeStatusWithAudit(
		ticketId: string,
		actorId: string,
		newStatus: TicketStatus,
		assignedToId: string | null
	): Promise<{ ticket: Ticket; lastUpdateId: string }> {
		return await super.prisma.$transaction(
			async (tx) => {
				const current = await tx.ticket.findUnique({
					where: { id: ticketId },
				});
				if (!current) throw new Error("TICKET_NOT_FOUND");
				const ticket = await tx.ticket.update({
					where: { id: ticketId },
					data: {
						status: newStatus,
						assignedTo: assignedToId
							? { connect: { id: assignedToId } }
							: { disconnect: true },
					},
				});
				const statusUpdate = await tx.ticketUpdate.create({
					data: {
						ticket: { connect: { id: ticket.id } },
						updatedBy: { connect: { id: actorId } },
						type: "STATUS_CHANGED" as UpdateType,
						content: JSON.stringify({
							from: current.status,
							to: newStatus,
						}),
						oldStatus: current.status,
						newStatus,
					},
				});
				if (
					(current.status === "PROPOSED" &&
						newStatus !== "PROPOSED" &&
						ticket.assignedToId) ||
					(current.status !== "PROPOSED" &&
						newStatus === "PROPOSED" &&
						current.assignedToId)
				) {
					await tx.ticketUpdate.create({
						data: {
							ticket: { connect: { id: ticket.id } },
							updatedBy: { connect: { id: actorId } },
							type: "ASSIGNMENT_CHANGED" as UpdateType,
							content: JSON.stringify({
								from: current.assignedToId || null,
								to: ticket.assignedToId || null,
							}),
							oldAssignedToId: current.assignedToId || null,
							newAssignedToId: ticket.assignedToId || null,
						},
					});
				}
				return { ticket, lastUpdateId: statusUpdate.id };
			},
			{ timeout: 15000 }
		);
	}

	static async changeAssigneeWithAudit(
		ticketId: string,
		actorId: string,
		newAssignedToId: string | null
	): Promise<{ ticket: Ticket; lastUpdateId: string }> {
		return await super.prisma.$transaction(
			async (tx) => {
				const current = await tx.ticket.findUnique({
					where: { id: ticketId },
				});
				if (!current) throw new Error("TICKET_NOT_FOUND");
				const ticket = await tx.ticket.update({
					where: { id: ticketId },
					data: {
						assignedTo: newAssignedToId
							? { connect: { id: newAssignedToId } }
							: { disconnect: true },
					},
				});
				const update = await tx.ticketUpdate.create({
					data: {
						ticket: { connect: { id: ticket.id } },
						updatedBy: { connect: { id: actorId } },
						type: "ASSIGNMENT_CHANGED" as UpdateType,
						content: JSON.stringify({
							from: current.assignedToId || null,
							to: ticket.assignedToId || null,
						}),
						oldAssignedToId: current.assignedToId || null,
						newAssignedToId: ticket.assignedToId || null,
					},
				});
				return { ticket, lastUpdateId: update.id };
			},
			{ timeout: 15000 }
		);
	}

	static async updateAssigneeAndStatusWithAudit(
		ticketId: string,
		actorId: string,
		updates: { newAssignedToId?: string | null; newStatus?: TicketStatus }
	): Promise<{ ticket: Ticket; lastUpdateId: string }> {
		return await super.prisma.$transaction(
			async (tx) => {
				const current = await tx.ticket.findUnique({
					where: { id: ticketId },
				});
				if (!current) throw new Error("TICKET_NOT_FOUND");
				const data: Prisma.TicketUpdateInput = {} as any;
				if (typeof updates.newStatus !== "undefined") {
					(data as any).status = updates.newStatus;
				}
				if (typeof updates.newAssignedToId !== "undefined") {
					(data as any).assignedTo = updates.newAssignedToId
						? { connect: { id: updates.newAssignedToId } }
						: { disconnect: true };
				}
				const ticket = await tx.ticket.update({
					where: { id: ticketId },
					data: data as any,
				});

				let lastUpdateId = "";
				// Status change audit
				if (
					typeof updates.newStatus !== "undefined" &&
					updates.newStatus !== current.status
				) {
					const statusUpdate = await tx.ticketUpdate.create({
						data: {
							ticket: { connect: { id: ticket.id } },
							updatedBy: { connect: { id: actorId } },
							type: "STATUS_CHANGED" as UpdateType,
							content: JSON.stringify({
								from: current.status,
								to: updates.newStatus,
							}),
							oldStatus: current.status,
							newStatus: updates.newStatus,
						},
					});
					lastUpdateId = statusUpdate.id;
				}

				// Assignment change audit
				if (
					typeof updates.newAssignedToId !== "undefined" &&
					(ticket.assignedToId || null) !==
						(updates.newAssignedToId || null)
				) {
					const assignUpdate = await tx.ticketUpdate.create({
						data: {
							ticket: { connect: { id: ticket.id } },
							updatedBy: { connect: { id: actorId } },
							type: "ASSIGNMENT_CHANGED" as UpdateType,
							content: JSON.stringify({
								from: current.assignedToId || null,
								to: ticket.assignedToId || null,
							}),
							oldAssignedToId: current.assignedToId || null,
							newAssignedToId: ticket.assignedToId || null,
						},
					});
					lastUpdateId = assignUpdate.id || lastUpdateId;
				}

				return { ticket, lastUpdateId };
			},
			{ timeout: 15000 }
		);
	}

	static async findProjectMeta(
		ticketId: string
	): Promise<{ projectId: string; title: string } | null> {
		const t = await super.prisma.ticket.findUnique({
			where: { id: ticketId },
			select: { projectId: true, title: true },
		});
		return t ? { projectId: t.projectId, title: t.title } : null;
	}
}
