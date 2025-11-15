import type { TicketComment, Prisma } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";
import crypto from "crypto";

export class TicketCommentRepository extends BaseRepository {
	static async create(
		ticketId: string,
		authorId: string,
		body: string
	): Promise<TicketComment> {
		const data: Prisma.TicketCommentCreateInput = {
			body,
			ticket: { connect: { id: ticketId } },
			author: { connect: { id: authorId } },
		};
		return super.prisma.ticketComment.create({ data });
	}

	static async createWithAudit(
		ticketId: string,
		authorId: string,
		body: string
	): Promise<{ comment: TicketComment; updateId: string }> {
		// Use non-interactive transaction (array form) to avoid 5s interactive timeout
		// Generate comment id upfront so we can reference it in the update payload
		const commentId = crypto.randomUUID();
		const [comment, update] = await super.prisma.$transaction([
			super.prisma.ticketComment.create({
				data: {
					id: commentId,
					body,
					ticket: { connect: { id: ticketId } },
					author: { connect: { id: authorId } },
				},
			}),
			super.prisma.ticketUpdate.create({
				data: {
					ticket: { connect: { id: ticketId } },
					updatedBy: { connect: { id: authorId } },
					type: "COMMENT" as any,
					content: JSON.stringify({
						commentId,
						snippet: body.slice(0, 140),
					}),
				},
			}),
		]);
		return { comment, updateId: update.id };
	}

	static async listByTicket(
		ticketId: string,
		limit = 50,
		cursor?: string
	): Promise<{
		comments: Array<
			TicketComment & {
				author: { id: string; username: string; email: string };
			}
		>;
		nextCursor?: string;
	}> {
		const where = { ticketId };
		const comments = await super.prisma.ticketComment.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: limit + 1,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
			include: {
				author: { select: { id: true, username: true, email: true } },
			},
		});
		let nextCursor: string | undefined;
		if (comments.length > limit) {
			const next = comments.pop();
			nextCursor = next?.id;
		}
		return { comments, nextCursor };
	}
}
