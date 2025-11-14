import type { Notification, Prisma } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

export class NotificationRepository extends BaseRepository {
	static async createMany(
		rows: Array<{
			recipientId: string;
			message: string;
			ticketUpdateId?: string | null;
			projectCreatedId?: string | null;
		}>
	): Promise<void> {
		if (rows.length === 0) return;
		await super.prisma.notification.createMany({
			data: rows.map((r) => ({
				recipientId: r.recipientId,
				message: r.message,
				ticketUpdateId: r.ticketUpdateId ?? null,
				projectCreatedId: r.projectCreatedId ?? null,
			})),
			skipDuplicates: true,
		});
	}

	static async createForRecipients(
		rows: Array<{
			recipientId: string;
			message: string;
			ticketUpdateId?: string | null;
			projectCreatedId?: string | null;
		}>
	): Promise<Notification[]> {
		if (rows.length === 0) return [];
		const ops = rows.map((r) =>
			super.prisma.notification.create({
				data: {
					recipientId: r.recipientId,
					message: r.message,
					ticketUpdateId: r.ticketUpdateId ?? null,
					projectCreatedId: r.projectCreatedId ?? null,
				},
			})
		);
		return super.prisma.$transaction(ops);
	}

	static async markAllRead(recipientId: string): Promise<number> {
		const res = await super.prisma.notification.updateMany({
			where: { recipientId, read: false },
			data: { read: true },
		});
		return res.count;
	}

	static async list(
		recipientId: string,
		unreadOnly = false,
		limit = 50
	): Promise<Notification[]> {
		return super.prisma.notification.findMany({
			where: { recipientId, ...(unreadOnly ? { read: false } : {}) },
			orderBy: { createdAt: "desc" },
			take: limit,
		});
	}
}
