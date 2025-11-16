import dotenv from "dotenv";
import crypto from "crypto";
import {
	OTP_CONFIG,
	USER_AUTH_CONFIG,
	SESSION_CONFIG,
	API_CONFIG,
} from "@repo/shared";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || "";
const ALLOWED_ORIGINS = rawOrigins
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);
const COOKIE_SECURE =
	(process.env.COOKIE_SECURE ??
		(NODE_ENV === "production" ? "true" : "false")) === "true";

const config = {
	DATABASE_URL:
		process.env.DATABASE_URL ||
		"postgresql://user:password@localhost:5432/mydb",

	PORT: process.env.PORT || 3000,

	NODE_ENV,

	// JWT Secrets
	JWT_SECRET: process.env.JWT_SECRET || "default_jwt_secret",
	JWT_REFRESH_SECRET:
		process.env.JWT_REFRESH_SECRET || "default_refresh_jwt_secret",

	// Admin JWT Secrets (separate for admin tokens)
	ADMIN_JWT_SECRET:
		process.env.ADMIN_JWT_SECRET || "default_admin_jwt_secret",

	// Admin Password
	ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
	// Derived hash of admin password (SHA-256 hex)
	ADMIN_PASSWORD_HASH: crypto
		.createHash("sha256")
		.update(process.env.ADMIN_PASSWORD || "admin123")
		.digest("hex"),

	REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

	SMTP_USER: process.env.SMTP_USER || "apikey",
	SMTP_PASS: process.env.SMTP_PASS || "default_smtp_pass",
	SMTP_HOST: process.env.SMTP_HOST || "smtp.example.com",
	SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
	FROM_EMAIL: process.env.FROM_EMAIL || "<sender@email.com>",

	// Frontend/Origins
	CLIENT_URL: process.env.CLIENT_URL,
	ALLOWED_ORIGINS,
	COOKIE_SECURE,

	// Authentication Configuration (from shared constants)
	OTP_LENGTH: Number(OTP_CONFIG.LENGTH),
	OTP_EXPIRY_MINUTES: Number(OTP_CONFIG.EXPIRY_MINUTES),
	OTP_REREQUEST_RATE_LIMIT_SECONDS: Number(
		OTP_CONFIG.RESEND_COOLDOWN_SECONDS
	),
	OTP_VERIFY_ATTEMPTS_LIMIT: Number(OTP_CONFIG.MAX_VERIFY_ATTEMPTS),

	USER_AUTH_ATTEMPTS_LIMIT: Number(USER_AUTH_CONFIG.MAX_LOGIN_ATTEMPTS),
	USER_AUTH_RATE_LIMIT_SECONDS: Number(USER_AUTH_CONFIG.RATE_LIMIT_SECONDS),

	// Session Configuration (from shared constants)
	ACCESS_TOKEN_EXPIRY_MINUTES: Number(
		SESSION_CONFIG.ACCESS_TOKEN_EXPIRY_MINUTES
	),
	REFRESH_TOKEN_EXPIRY_DAYS: Number(SESSION_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS),
	ADMIN_PRIVILEGE_EXPIRY_MINUTES: Number(
		SESSION_CONFIG.ADMIN_PRIVILEGE_EXPIRY_MINUTES
	),

	// API Configuration
	REQUEST_TIMEOUT_MS: Number(API_CONFIG.TIMEOUT_MS),

	isDevelopment: NODE_ENV === "development",
	sendOutMails: (process.env.SEND_OUT_MAILS || "true") === "true",

	// Cookie settings
	COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
	COOKIE_SAME_SITE:
		(process.env.COOKIE_SAME_SITE as "lax" | "strict" | "none") || "strict",
};

export default config;
