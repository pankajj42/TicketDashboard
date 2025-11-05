import { SessionService } from "../services/session.service.js";
import { OtpService } from "../services/otp.service.js";

export class CleanupService {
	private static isRunning = false;
	private static intervalId: NodeJS.Timeout | null = null;

	// Start the cleanup job
	static start(intervalMinutes: number = 60): void {
		if (this.isRunning) {
			console.warn("Cleanup service is already running");
			return;
		}

		this.isRunning = true;
		const intervalMs = intervalMinutes * 60 * 1000;

		console.log(
			`🧹 Starting cleanup service (runs every ${intervalMinutes} minutes)`
		);

		// Run immediately on start
		this.runCleanup();

		// Schedule recurring cleanup
		this.intervalId = setInterval(() => {
			this.runCleanup();
		}, intervalMs);
	}

	// Stop the cleanup job
	static stop(): void {
		if (!this.isRunning) {
			console.warn("Cleanup service is not running");
			return;
		}

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.isRunning = false;
		console.log("🧹 Cleanup service stopped");
	}

	// Manual cleanup trigger
	static async runCleanup(): Promise<void> {
		try {
			console.log("🧹 Running cleanup job...");
			const startTime = Date.now();

			// Clean up expired refresh tokens
			const deletedTokens = await SessionService.cleanupExpiredSessions();

			// Clean up expired OTP codes
			const deletedOtps = await OtpService.cleanupAllExpiredOtps();

			const duration = Date.now() - startTime;

			console.log(`✅ Cleanup completed in ${duration}ms:`);
			console.log(`   - Deleted ${deletedTokens} expired refresh tokens`);
			console.log(`   - Deleted ${deletedOtps} expired OTP codes`);

			// Log metrics for monitoring
			this.logCleanupMetrics({
				duration,
				deletedTokens,
				deletedOtps,
				timestamp: new Date(),
			});
		} catch (error) {
			console.error("❌ Cleanup job failed:", error);

			// Could send alerts to monitoring service here
			this.handleCleanupError(error);
		}
	}

	// Log cleanup metrics (could be sent to monitoring service)
	private static logCleanupMetrics(metrics: {
		duration: number;
		deletedTokens: number;
		deletedOtps: number;
		timestamp: Date;
	}): void {
		// In production, this could send metrics to:
		// - Prometheus
		// - DataDog
		// - CloudWatch
		// - Application Insights

		console.log("📊 Cleanup metrics:", {
			duration_ms: metrics.duration,
			deleted_tokens: metrics.deletedTokens,
			deleted_otps: metrics.deletedOtps,
			timestamp: metrics.timestamp.toISOString(),
		});
	}

	// Handle cleanup errors (could send alerts)
	private static handleCleanupError(error: any): void {
		// In production, this could:
		// - Send alerts to Slack/Teams
		// - Create incidents in PagerDuty
		// - Log to error tracking service (Sentry)

		console.error("Cleanup error details:", {
			message: error.message,
			stack: error.stack,
			timestamp: new Date().toISOString(),
		});
	}
}

// Export singleton instance
export default CleanupService;
