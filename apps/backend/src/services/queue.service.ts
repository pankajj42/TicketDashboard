import { Queue, Worker } from "bullmq";
import { EmailService } from "../services/email.service.js";
import config from "../config/env.js";

class QueueManager {
	private static instance: QueueManager;
	private connection: { url: string };
	public otpQueue: Queue;
	public notificationQueue: Queue;

	static getInstance(): QueueManager {
		if (!QueueManager.instance) {
			QueueManager.instance = new QueueManager();
		}
		return QueueManager.instance;
	}

	async addOtpJob(data: { email: string; otp: string }): Promise<void> {
		await this.otpQueue.add("send-otp", data, {
			priority: 1,
		});
	}

	async addNotificationJob(data: {
		email: string;
		subject: string;
		message: string;
	}): Promise<void> {
		await this.notificationQueue.add("send-notification", data, {
			priority: 2,
		});
	}

	private constructor() {
		this.connection = { url: config.REDIS_URL };

		// Setup OTP Queue
		this.otpQueue = new Queue("otp", {
			connection: this.connection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 1000,
				},
				removeOnComplete: 100,
				removeOnFail: 1000,
				priority: 1,
			},
		});

		// Setup Notification Queue
		this.notificationQueue = new Queue("notification", {
			connection: this.connection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 5000,
				},
				removeOnComplete: 100,
				removeOnFail: 1000,
				priority: 2,
			},
		});

		// Start OTP Worker
		new Worker(
			"otp",
			async (job) => {
				const { email, otp } = job.data;
				await EmailService.sendOtpEmail(email, otp);
			},
			{
				connection: this.connection,
				concurrency: 5,
			}
		);

		// Start Notification Worker
		new Worker(
			"notification",
			async (job) => {
				const { email, subject, message } = job.data;
				await EmailService.sendNotificationEmail(
					email,
					subject,
					message
				);
			},
			{
				connection: this.connection,
				concurrency: 10,
			}
		);

		console.log("✅ Queue workers started");
	}

	async close(): Promise<void> {
		await this.otpQueue.close();
		await this.notificationQueue.close();
	}
}

export const queue = QueueManager.getInstance();
