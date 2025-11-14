import { Router } from "express";
import {
	authenticateToken,
	createRedisRateLimit,
} from "../middleware/auth.middleware.js";
import { TicketCommentService } from "../services/ticket-comment.service.js";
import { TicketCommentRepository } from "../repositories/ticket-comment.repository.js";
import { CreateCommentSchema } from "@repo/shared";

const router = Router();

router.use(authenticateToken);

const commentLimit = createRedisRateLimit("comment", 30, 60_000);

router.post(
	"/tickets/:ticketId/comments",
	commentLimit,
	async (req, res, next) => {
		try {
			const ticketId = req.params.ticketId as string;
			const userId = (req as any).user.userId;
			const parsed = CreateCommentSchema.parse(req.body);
			const body: string = parsed.body.trim();
			const comment = await TicketCommentService.addComment(
				ticketId,
				userId,
				body
			);
			res.status(201).json({ comment });
		} catch (e) {
			next(e);
		}
	}
);

router.get("/tickets/:ticketId/comments", async (req, res, next) => {
	try {
		const ticketId = req.params.ticketId as string;
		const { limit, cursor } = req.query as {
			limit?: string;
			cursor?: string;
		};
		const take = Math.min(parseInt(limit || "50", 10), 100);
		const { comments, nextCursor } =
			await TicketCommentRepository.listByTicket(ticketId, take, cursor);
		res.json({ comments, nextCursor });
	} catch (e) {
		next(e);
	}
});

export default router;
