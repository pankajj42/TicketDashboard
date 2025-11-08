import dotenv from "dotenv";

dotenv.config();

const config = {
	DATABASE_URL:
		process.env.DATABASE_URL ||
		"postgresql://user:password@localhost:5432/mydb",

	PORT: process.env.PORT || 3000,

	// JWT Secrets
	JWT_SECRET: process.env.JWT_SECRET || "default_jwt_secret",
	JWT_REFRESH_SECRET:
		process.env.JWT_REFRESH_SECRET || "default_refresh_jwt_secret",

	// Admin JWT Secrets (separate for admin tokens)
	ADMIN_JWT_SECRET:
		process.env.ADMIN_JWT_SECRET || "default_admin_jwt_secret",
	ADMIN_JWT_REFRESH_SECRET:
		process.env.ADMIN_JWT_REFRESH_SECRET ||
		"default_admin_refresh_jwt_secret",

	// Admin Password
	ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",

	REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

	SMTP_USER: process.env.SMTP_USER || "apikey",
	SMTP_PASS: process.env.SMTP_PASS || "default_smtp_pass",
	SMTP_HOST: process.env.SMTP_HOST || "smtp.example.com",
	SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
	FROM_EMAIL: process.env.FROM_EMAIL || "<sender@email.com>",

	// OTP Configuration
	OTP_LENGTH: parseInt(process.env.OTP_LENGTH || "6"),
	OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || "5"),
	OTP_RATE_LIMIT_SECONDS: parseInt(
		process.env.OTP_RATE_LIMIT_SECONDS || "60"
	),

	isDevelopment: (process.env.NODE_ENV || "development") === "development",
	sendOutMails: (process.env.SEND_OUT_MAILS || "true") === "true",
};

export default config;
