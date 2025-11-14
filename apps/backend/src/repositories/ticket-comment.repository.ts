import type { TicketComment, Prisma } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

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
		return await super.prisma.$transaction(async (tx) => {
			const comment = await tx.ticketComment.create({
				data: {
					body,
					ticket: { connect: { id: ticketId } },
					author: { connect: { id: authorId } },
				},
			});
			const update = await tx.ticketUpdate.create({
				data: {
					ticket: { connect: { id: ticketId } },
					updatedBy: { connect: { id: authorId } },
					type: "COMMENT" as any,
					content: JSON.stringify({
						commentId: comment.id,
						snippet: body.slice(0, 140),
					}),
				},
			});
			return { comment, updateId: update.id };
		});
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
