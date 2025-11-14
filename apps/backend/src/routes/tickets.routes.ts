import { Router } from "express";
import {
	authenticateToken,
	createRedisRateLimit,
	attachAdminStatus,
	ensureAdmin,
} from "../middleware/auth.middleware.js";
import { TicketService } from "../services/ticket.service.js";
import {
	CreateTicketSchema,
	UpdateTicketDetailsSchema,
	ChangeTicketStatusSchema,
} from "@repo/shared";

import { TicketRepository } from "../repositories/ticket.repository.js";
import { TicketUpdateRepository } from "../repositories/ticket-update.repository.js";
import { z } from "zod";

const router = Router();

router.use(authenticateToken);

const statusLimit = createRedisRateLimit("status", 100, 60_000);
router.post("/projects/:projectId/tickets", async (req, res, next) => {
	try {
		const ticket = await TicketService.createTicket(
			req.params.projectId,
			req.user!.userId,
			CreateTicketSchema.parse(req.body)
		);
		res.status(201).json({ ticket });
	} catch (e) {
		next(e);
	}
});

router.get("/projects/:projectId/tickets", async (req, res, next) => {
	try {
		const tickets = await TicketRepository.listByProject(
			req.params.projectId
		);
		res.json({ tickets });
	} catch (e) {
		next(e);
	}
});

router.patch("/tickets/:ticketId", async (req, res, next) => {
	try {
		const updated = await TicketService.updateTicketDetails(
			req.params.ticketId,
			req.user!.userId,
			UpdateTicketDetailsSchema.parse(req.body)
		);
		res.json({ ticket: updated });
	} catch (e) {
		next(e);
	}
});

router.patch(
	"/tickets/:ticketId/status",
	statusLimit,
	async (req, res, next) => {
		try {
			const updated = await TicketService.changeStatus(
				req.params.ticketId,
				req.user!.userId,
				ChangeTicketStatusSchema.parse(req.body)
			);
			res.json({ ticket: updated });
		} catch (e) {
			next(e);
		}
	}
);

// Place specific routes before parameterized /tickets/:ticketId to avoid conflicts
router.get("/tickets/created", async (req, res, next) => {
	try {
		const userId = req.user!.userId;
		const tickets = await TicketRepository.listByCreator(userId);
		res.json({ tickets });
	} catch (e) {
		next(e);
	}
});

router.get("/tickets/assigned", async (req, res, next) => {
	try {
		const userId = req.user!.userId;
		const tickets = await TicketRepository.listByAssignee(userId);
		res.json({ tickets });
	} catch (e) {
		next(e);
	}
});

router.get("/tickets/:ticketId", async (req, res, next) => {
	try {
		const ticketId = req.params.ticketId;
		const ticket = await TicketRepository.findDetailedById(ticketId);
		if (!ticket) return res.status(404).json({ error: "Not found" });
		res.json({ ticket });
	} catch (e) {
		next(e);
	}
});

router.get(
	"/tickets/:ticketId/updates",
	attachAdminStatus,
	ensureAdmin,
	async (req, res, next) => {
		try {
			const ticketId = req.params.ticketId;
			const updates =
				await TicketUpdateRepository.listByTicketWithUser(ticketId);
			res.json({ updates });
		} catch (e) {
			next(e);
		}
	}
);

// Change assignee (admin only)
router.patch(
	"/tickets/:ticketId/assignee",
	attachAdminStatus,
	ensureAdmin,
	async (req, res, next) => {
		try {
			const body = z
				.object({ userId: z.string().uuid().nullable().optional() })
				.parse(req.body);
			const updated = await TicketService.changeAssignee(
				req.params.ticketId,
				req.user!.userId,
				body
			);
			res.json({ ticket: updated });
		} catch (e) {
			next(e);
		}
	}
);

// Combined assignee + status update (admin only)
router.patch(
	"/tickets/:ticketId/assignee-status",
	attachAdminStatus,
	ensureAdmin,
	async (req, res, next) => {
		try {
			const body = z
				.object({
					userId: z.string().uuid().nullable().optional(),
					status: ChangeTicketStatusSchema.shape.status.optional(),
				})
				.parse(req.body);
			const updated = await TicketService.changeAssigneeAndStatus(
				req.params.ticketId,
				req.user!.userId,
				body
			);
			res.json({ ticket: updated });
		} catch (e) {
			next(e);
		}
	}
);

// end specific routes

export default router;
