import type {
	TicketUpdate,
	UpdateType,
	Prisma,
	TicketStatus,
} from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

export class TicketUpdateRepository extends BaseRepository {
	static async log(params: {
		ticketId: string;
		updatedById: string;
		type: UpdateType;
		content?: Record<string, any>;
		oldStatus?: TicketStatus | null;
		newStatus?: TicketStatus | null;
		oldAssignedToId?: string | null;
		newAssignedToId?: string | null;
	}): Promise<TicketUpdate> {
		const data: Prisma.TicketUpdateCreateInput = {
			type: params.type,
			content: JSON.stringify(params.content ?? {}),
			ticket: { connect: { id: params.ticketId } },
			updatedBy: { connect: { id: params.updatedById } },
			...(params.oldStatus ? { oldStatus: params.oldStatus } : {}),
			...(params.newStatus ? { newStatus: params.newStatus } : {}),
			...(params.oldAssignedToId
				? { oldAssignedToId: params.oldAssignedToId }
				: {}),
			...(params.newAssignedToId
				? { newAssignedToId: params.newAssignedToId }
				: {}),
		} as unknown as Prisma.TicketUpdateCreateInput;
		return super.prisma.ticketUpdate.create({ data });
	}

	static async findLatestIdByTicket(
		ticketId: string
	): Promise<string | null> {
		const row = await super.prisma.ticketUpdate.findFirst({
			where: { ticketId },
			orderBy: { createdAt: "desc" },
			select: { id: true },
		});
		return row?.id ?? null;
	}

	static async listByTicketWithUser(ticketId: string) {
		return super.prisma.ticketUpdate.findMany({
			where: { ticketId },
			orderBy: { createdAt: "desc" },
			include: { updatedBy: { select: { id: true, username: true } } },
		});
	}
}
