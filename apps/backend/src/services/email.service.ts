import nodemailer from "nodemailer";
import config from "../config/env.js";

export class EmailService {
	private static transporter: nodemailer.Transporter | null = null;

	private static async getTransporter(): Promise<nodemailer.Transporter> {
		if (this.transporter) {
			return this.transporter;
		}

		// For development, or without SMTP config, log to console
		if (config.isDevelopment || !config.SMTP_USER || !config.SMTP_PASS) {
			console.log("Emails will be logged to console.");

			this.transporter = nodemailer.createTransport({
				streamTransport: true,
				newline: "unix",
				buffer: true,
			});
		} else {
			this.transporter = nodemailer.createTransport({
				host: config.SMTP_HOST,
				port: config.SMTP_PORT,
				secure: config.SMTP_PORT === 465,
				auth: {
					user: config.SMTP_USER,
					pass: config.SMTP_PASS,
				},
			});
		}

		return this.transporter;
	}

	static async sendOtpEmail(email: string, otp: string): Promise<void> {
		try {
			const transporter = await this.getTransporter();

			const mailOptions = {
				from: config.FROM_EMAIL,
				to: email,
				subject: "Your TicketDash OTP",
				html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">TicketDash Login</h2>
            <p>Your One-Time Password (OTP) for login is:</p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
              <strong>${otp}</strong>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this OTP, please ignore this email.</p>
          </div>
        `,
			};

			const info = await transporter.sendMail(mailOptions);
			console.log(`OTP email sent to ${email}`);
			if (
				config.isDevelopment ||
				!config.SMTP_USER ||
				!config.SMTP_PASS
			) {
				console.log(
					"Email would be sent with options:",
					info.message.toString()
				);
			}
		} catch (error) {
			console.error("Error sending OTP email:", error);
			throw new Error("Failed to send OTP email");
		}
	}

	static async sendNotificationEmail(
		email: string,
		subject: string,
		message: string
	): Promise<void> {
		try {
			const transporter = await this.getTransporter();

			const mailOptions = {
				from: config.FROM_EMAIL,
				to: email,
				subject: `TicketDash: ${subject}`,
				html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">${subject}</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              ${message}
            </div>
            <p>You're receiving this email because you're subscribed to updates from TicketDash.</p>
          </div>
        `,
			};

			const info = await transporter.sendMail(mailOptions);
			console.log(`Notification email sent to ${email}`);
			if (
				config.isDevelopment ||
				!config.SMTP_USER ||
				!config.SMTP_PASS
			) {
				console.log(
					"Email would be sent with options:",
					info.message.toString()
				);
			}
		} catch (error) {
			console.error("Error sending notification email:", error);
			throw new Error("Failed to send notification email");
		}
	}
}
