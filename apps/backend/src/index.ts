import config from "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { title } from "@repo/shared";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/projects.routes.js";
import ticketRoutes from "./routes/tickets.routes.js";
import commentRoutes from "./routes/comments.routes.js";
import notificationRoutes from "./routes/notifications.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { Realtime } from "./services/realtime.service.js";
import CleanupService from "./services/cleanup.service.js";
import { redis } from "./lib/redis.js";
import { queue } from "./services/queue.service.js";
import { AdminExpiryWatcher } from "./services/admin-expiry.service.js";

const app = express();

// Security middleware
app.set("trust proxy", 1); // needed for secure cookies behind proxy/CDN
// Debug CORS origins on startup (remove or silence later)
console.log("Configured ALLOWED_ORIGINS:", config.ALLOWED_ORIGINS);
console.log(
	"NODE_ENV:",
	config.NODE_ENV,
	"COOKIE_SECURE:",
	config.COOKIE_SECURE
);
app.use(
	helmet({
		contentSecurityPolicy: config.isDevelopment ? false : undefined,
	})
);

app.use(
	cors({
		origin: (origin, cb) => {
			// allow non-browser requests (no Origin header)
			if (!origin) return cb(null, true);
			// normalize incoming origin (strip trailing slash)
			const normalizedOrigin = origin.replace(/\/$/, "");
			// allow if explicitly listed
			if (
				Array.isArray(config.ALLOWED_ORIGINS) &&
				config.ALLOWED_ORIGINS.includes(normalizedOrigin)
			) {
				return cb(null, true);
			}
			// allow localhost during development for convenience
			if (
				config.isDevelopment &&
				normalizedOrigin.startsWith("http://localhost")
			) {
				return cb(null, true);
			}
			return cb(new Error("Not allowed by CORS"));
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
	})
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", ticketRoutes);
app.use("/api", commentRoutes);
app.use("/api", notificationRoutes);
app.use("/api", usersRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
	res.status(200).json({
		status: "ok",
		timestamp: new Date().toISOString(),
		title: title,
	});
});

// 404 handler - catch all undefined routes
app.use((req, res, next) => {
	const error = new Error(`Endpoint not found: ${req.originalUrl}`);
	(error as any).status = 404;
	(error as any).code = "NOT_FOUND";
	next(error);
});

// Global error handler (must be last)
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) => {
		// If headers already sent by a previous handler, delegate to default error handler
		if (res.headersSent) {
			return next(err);
		}
		console.error("Unhandled error:", err);

		// Handle known Prisma errors (e.g., unique constraint violations)
		if (err && typeof err === "object" && typeof err.code === "string") {
			// P2002: Unique constraint failed
			if (err.code === "P2002") {
				const target = Array.isArray(err?.meta?.target)
					? err.meta.target.join(", ")
					: String(err?.meta?.target || "");
				const isProjectName = target.includes("name");
				res.status(409).json({
					error: isProjectName
						? "Project name already exists"
						: "Unique constraint violation",
					code: isProjectName
						? "PROJECT_NAME_EXISTS"
						: "UNIQUE_VIOLATION",
					details: { target },
				});
				return;
			}
			// P2028: Transaction already closed / timed out
			if (err.code === "P2028") {
				res.status(504).json({
					error: "Operation timed out, please retry",
					code: "TX_TIMEOUT",
				});
				return;
			}
		}

		const status = err.status || 500;
		const code = err.code || "INTERNAL_ERROR";

		res.status(status).json({
			error:
				status === 404 ? "Endpoint not found" : "Internal server error",
			code: code,
			...(status === 404 && { path: req.originalUrl }),
			...(config.isDevelopment &&
				status === 500 && { message: err.message }),
		});
	}
);

// Graceful shutdown
const gracefulShutdown = async (action: string) => {
	console.log(`${action} received, shutting down gracefully`);
	await prisma.$disconnect();
	await redis.quit();
	await queue.close();
	process.exit(0);
};

process.on("SIGTERM", async () => {
	gracefulShutdown("SIGTERM");
});

process.on("SIGINT", async () => {
	gracefulShutdown("SIGINT");
});

Realtime.attach(app, Number(config.PORT));
console.log(`🚀 Server running with realtime on port ${config.PORT}`);

// Start cleanup service (runs every hour)
CleanupService.start(60);
// Start admin expiry watcher (server-push admin:revoked)
AdminExpiryWatcher.start(5000);
