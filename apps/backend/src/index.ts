import config from "./config/env.js";
import express from "express";
import { title } from "@repo/shared";
import { PrismaClient, Prisma, User } from "./generated/prisma/client.js";
import { z } from "zod";

const app = express();
app.use(express.json());

const prisma = new PrismaClient();
prisma.$connect();

const UserCreateSchema = z.object({
	email: z.string().email(),
	username: z.string().min(3).max(20),
}) satisfies z.ZodType<
	Omit<Prisma.UserCreateInput, "id" | "createdAt" | "updatedAt">
>;

app.get("/api/health", async (req, res) => {
	try {
		// Validate input
		const userData = UserCreateSchema.parse(req.body);

		// Type-safe database operation
		const user: User = await prisma.user.upsert({
			create: userData,
			update: { username: userData.username },
			where: { email: userData.email },
		});

		console.log(user);
		res.json({ status: "OK", data: title });
	} catch (error) {
		if (error instanceof z.ZodError) {
			res.status(400).json({ errors: error.issues });
		} else {
			console.error(error);
			res.status(500).json({ error: "Internal server error" });
		}
	}
});

app.listen(config.PORT, () => {
	console.log(`Server is running on port ${config.PORT}`);
});
