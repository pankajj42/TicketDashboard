import { Router } from "express";
import {
	authenticateToken,
	attachAdminStatus,
	ensureAdmin,
} from "../middleware/auth.middleware.js";
import { UserRepository } from "../repositories/user.repository.js";

const router = Router();

router.use(authenticateToken);

router.get("/users", attachAdminStatus, ensureAdmin, async (req, res, next) => {
	try {
		const users = await UserRepository.findAllActiveLite();
		res.json({ users });
	} catch (e) {
		next(e);
	}
});

export default router;
