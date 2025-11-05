import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
	authenticateToken,
	authRateLimit,
	authErrorHandler,
	validateDeviceInfo,
} from "../middleware/auth.middleware.js";

const router = Router();

// Rate limiting for auth endpoints (5 attempts per 15 minutes)
const authLimit = authRateLimit(5, 15 * 60 * 1000);

// Public routes (no authentication required)
router.post("/login", authLimit, AuthController.login);
router.post(
	"/verify-otp",
	authLimit,
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

// Error handler for auth routes
router.use(authErrorHandler);

export default router;
