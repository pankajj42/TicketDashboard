import nodemailer from "nodemailer";
import config from "../config/env.js";

export class EmailService {
	private static transporter: nodemailer.Transporter | null = null;

	private static async getTransporter(): Promise<nodemailer.Transporter> {
		if (this.transporter) {
			return this.transporter;
		}

		// Check if we should send real emails or just log to console
		if (!config.sendOutMails || !config.SMTP_USER || !config.SMTP_PASS) {
			console.log(
				"Emails will be logged to console (SEND_OUT_MAILS=false or missing SMTP config)."
			);

			this.transporter = nodemailer.createTransport({
				streamTransport: true,
				newline: "unix",
				buffer: true,
			});
		} else {
			console.log(
				"Configuring real SMTP transporter (SEND_OUT_MAILS=true)."
			);
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

			if (config.sendOutMails && config.SMTP_USER && config.SMTP_PASS) {
				console.log(`✅ OTP email sent successfully to ${email}`);
			} else {
				console.log(`📧 OTP email (mock) for ${email}: ${otp}`);
				console.log(
					"Email content:",
					info.message?.toString() || "Email prepared but not sent"
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

			if (config.sendOutMails && config.SMTP_USER && config.SMTP_PASS) {
				console.log(
					`✅ Notification email sent successfully to ${email}`
				);
			} else {
				console.log(
					`📧 Notification email (mock) for ${email}: ${subject}`
				);
				console.log(
					"Email content:",
					info.message?.toString() || "Email prepared but not sent"
				);
			}
		} catch (error) {
			console.error("Error sending notification email:", error);
			throw new Error("Failed to send notification email");
		}
	}
}
