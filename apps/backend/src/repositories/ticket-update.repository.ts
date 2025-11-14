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
		const updates = await super.prisma.ticketUpdate.findMany({
			where: { ticketId },
			orderBy: { createdAt: "desc" },
			include: { updatedBy: { select: { id: true, username: true } } },
		});
		// Collect unique user ids referenced in assignment changes
		const ids = new Set<string>();
		for (const u of updates) {
			if (u.oldAssignedToId) ids.add(u.oldAssignedToId);
			if (u.newAssignedToId) ids.add(u.newAssignedToId);
		}
		const idList = [...ids];
		const userMap: Record<string, { id: string; username: string }> = {};
		if (idList.length > 0) {
			const users = await super.prisma.user.findMany({
				where: { id: { in: idList } },
				select: { id: true, username: true },
			});
			for (const u of users) userMap[u.id] = u;
		}
		return updates.map((u) => ({
			...u,
			oldAssigneeName: u.oldAssignedToId
				? (userMap[u.oldAssignedToId]?.username ?? u.oldAssignedToId)
				: null,
			newAssigneeName: u.newAssignedToId
				? (userMap[u.newAssignedToId]?.username ?? u.newAssignedToId)
				: null,
		}));
	}
}
