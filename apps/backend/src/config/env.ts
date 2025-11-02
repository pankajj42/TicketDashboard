import dotenv from "dotenv";

dotenv.config();

const config = {
	DATABASE_URL:
		process.env.DATABASE_URL ||
		"postgresql://user:password@localhost:5432/mydb",

	PORT: process.env.PORT || 3000,

	JWT_SECRET: process.env.JWT_SECRET || "default_jwt_secret",
	ADMIN_JWT_SECRET:
		process.env.ADMIN_JWT_SECRET || "default_admin_jwt_secret",

	REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

	SMTP_USER: process.env.SMTP_USER || "apikey",
	SMTP_PASS: process.env.SMTP_PASS || "default_smtp_pass",
	SMTP_HOST: process.env.SMTP_HOST || "smtp.example.com",
	SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
	FROM_EMAIL: process.env.FROM_EMAIL || "<sender@email.com>",

	isDevelopment: (process.env.NODE_ENV || "development") === "development",
};

export default config;
