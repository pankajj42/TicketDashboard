import config from "../config/env.js";

const BREVO_ENDPOINT = config.BREVO_API_URL;

function isMailSendingEnabled(): boolean {
	return (
		config.sendOutMails &&
		Boolean(config.BREVO_API_KEY) &&
		Boolean(config.FROM_EMAIL)
	);
}

function getSender() {
	return {
		name: config.BREVO_SENDER_NAME,
		email: config.FROM_EMAIL,
	};
}

async function sendToBrevo(payload: Record<string, unknown>) {
	const response = await fetch(BREVO_ENDPOINT, {
		method: "POST",
		headers: {
			"accept": "application/json",
			"content-type": "application/json",
			"api-key": config.BREVO_API_KEY,
		},
		body: JSON.stringify(payload),
	});

	let responseJson;
	try {
		responseJson = await response.json();
	} catch (err) {
		throw new Error(`Brevo response parsing failed: ${err}`);
	}

	if (!response.ok) {
		const errorMessage = responseJson?.message || responseJson || response.statusText;
		throw new Error(`Brevo email send failed (${response.status}): ${errorMessage}`);
	}

	return responseJson;
}

export class EmailService {
	static async sendOtpEmail(email: string, otp: string): Promise<void> {
		const mailPayload = {
			sender: getSender(),
			to: [
				{
					email,
					name: email,
				},
			],
			subject: "Your TicketDash OTP",
			htmlContent: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">TicketDash Login</h2>
					<p>Your One-Time Password (OTP) for login is:</p>
					<div style="background: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
						<strong>${otp}</strong>
					</div>
					<p>This OTP will expire in ${config.OTP_EXPIRY_MINUTES} minute${
						config.OTP_EXPIRY_MINUTES === 1 ? "" : "s"
					}.</p>
					<p>If you didn't request this OTP, please ignore this email.</p>
				</div>
			`,
		};

		if (!isMailSendingEnabled()) {
			console.log("📧 Email sending disabled; OTP email payload:", mailPayload);
			return;
		}

		try {
			const result = await sendToBrevo(mailPayload);
			console.log(`✅ OTP email sent successfully to ${email}. messageId=${result.messageId || "unknown"}`);
		} catch (error) {
			console.error("Error sending OTP email via Brevo:", error);
			throw new Error("Failed to send OTP email");
		}
	}

	static async sendNotificationEmail(
		email: string,
		subject: string,
		message: string
	): Promise<void> {
		const mailPayload = {
			sender: getSender(),
			to: [
				{
					email,
					name: email,
				},
			],
			subject: `TicketDash: ${subject}`,
			htmlContent: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #333;">${subject}</h2>
					<div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
						${message}
					</div>
					<p>You're receiving this email because you're subscribed to updates from TicketDash.</p>
				</div>
			`,
		};

		if (!isMailSendingEnabled()) {
			console.log("📧 Email sending disabled; notification email payload:", mailPayload);
			return;
		}

		try {
			const result = await sendToBrevo(mailPayload);
			console.log(`✅ Notification email sent successfully to ${email}. messageId=${result.messageId || "unknown"}`);
		} catch (error) {
			console.error("Error sending notification email via Brevo:", error);
			throw new Error("Failed to send notification email");
		}
	}
}

