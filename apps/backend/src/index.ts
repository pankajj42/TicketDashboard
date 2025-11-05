import config from "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { title } from "@repo/shared";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import CleanupService from "./services/cleanup.service.js";
import { redis } from "./lib/redis.js";
import { queue } from "./services/queue.service.js";

const app = express();

// Security middleware
app.use(
	helmet({
		contentSecurityPolicy: config.isDevelopment ? false : undefined,
	})
);

app.use(
	cors({
		origin: config.isDevelopment ? "http://localhost:5173" : false,
		credentials: true, // Allow cookies
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	})
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

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
		console.error("Unhandled error:", err);

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

app.listen(config.PORT, () => {
	console.log(`🚀 Server running on port ${config.PORT}`);

	// Start cleanup service (runs every hour)
	CleanupService.start(60);
});
