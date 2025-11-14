import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
	authenticateToken,
	createRedisRateLimit,
	validateDeviceInfo,
} from "../middleware/auth.middleware.js";

const router = Router();

// Rate limiting for auth endpoints (Redis-backed)
const loginLimit = createRedisRateLimit("login");
const verifyLimit = createRedisRateLimit(
	"verify",
	undefined,
	undefined,
	(req) => {
		const ip =
			(req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
		const email = (req.body as any)?.email || "";
		return `${ip}:${email}`;
	}
);

// Public routes (no authentication required)
router.post("/login", loginLimit, AuthController.login);
router.post(
	"/verify-otp",
	verifyLimit,
	validateDeviceInfo,
	AuthController.verifyOtp
);
router.post("/refresh", AuthController.refreshToken);

// Protected routes (authentication required)
router.use(authenticateToken);
router.post("/logout", AuthController.logout);
router.get("/devices", AuthController.getDevices);
router.delete("/devices/:sessionId", AuthController.logoutDevice);
router.get("/me", AuthController.getCurrentUser);
router.put("/profile", AuthController.updateProfile);

// Admin elevation endpoints (protected)
const adminElevateLimit = createRedisRateLimit(
	"admin-elevate",
	undefined,
	undefined,
	(req) => {
		const ip =
			(req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
		const userId = (req as any).user?.userId || "anon";
		return `${ip}:${userId}`;
	}
);
router.post("/admin-elevation", adminElevateLimit, AuthController.elevateAdmin);
router.delete("/admin-elevation", AuthController.revokeAdmin);

export default router;
