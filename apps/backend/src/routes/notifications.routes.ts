import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { NotificationRepository } from "../repositories/notification.repository.js";

const router = Router();

router.use(authenticateToken);

router.get("/notifications", async (req, res, next) => {
	try {
		const unreadOnly = (req.query.unreadOnly as string) === "true";
		const list = await NotificationRepository.list(
			req.user!.userId,
			unreadOnly
		);
		res.json({ notifications: list });
	} catch (e) {
		next(e);
	}
});

router.post("/notifications/mark-all-read", async (req, res, next) => {
	try {
		const count = await NotificationRepository.markAllRead(
			req.user!.userId
		);
		res.json({ success: true, count });
	} catch (e) {
		next(e);
	}
});

export default router;
