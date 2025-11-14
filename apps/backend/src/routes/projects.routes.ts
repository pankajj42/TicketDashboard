import { Router } from "express";
import {
	authenticateToken,
	attachAdminStatus,
	ensureAdmin,
} from "../middleware/auth.middleware.js";
import { ProjectService } from "../services/project.service.js";
import { z } from "zod";
import { CreateProjectSchema } from "@repo/shared";

const router = Router();

router.use(authenticateToken);

router.post("/", attachAdminStatus, ensureAdmin, async (req, res, next) => {
	try {
		const actorId = req.user!.userId;
		const project = await ProjectService.createProject(
			actorId,
			CreateProjectSchema.parse(req.body)
		);
		res.status(201).json({ project });
	} catch (e) {
		next(e);
	}
});

router.get("/", async (req, res, next) => {
	try {
		const userId = req.user?.userId;
		const projects = await ProjectService.listProjects(userId);
		res.json({ projects });
	} catch (e) {
		next(e);
	}
});

router.post("/:id/subscribe", async (req, res, next) => {
	try {
		await ProjectService.subscribe(req.params.id, req.user!.userId);
		res.json({ success: true });
	} catch (e) {
		next(e);
	}
});

router.delete("/:id/subscribe", async (req, res, next) => {
	try {
		await ProjectService.unsubscribe(req.params.id, req.user!.userId);
		res.json({ success: true });
	} catch (e) {
		next(e);
	}
});

export default router;
