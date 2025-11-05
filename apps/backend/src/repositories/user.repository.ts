import type { User, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export class UserRepository {
	static async findByEmail(email: string): Promise<User | null> {
		return prisma.user.findUnique({
			where: {
				email,
				isActive: true, // Only return active users
			},
		});
	}

	static async findById(id: string): Promise<User | null> {
		return prisma.user.findUnique({
			where: {
				id,
				isActive: true, // Only return active users
			},
		});
	}

	static async create(email: string, username?: string): Promise<User> {
		const data: Prisma.UserCreateInput = {
			email,
			username:
				username || UserRepository.generateUsernameFromEmail(email),
			lastLoginAt: new Date(),
		};

		return prisma.user.create({ data });
	}

	static async update(
		id: string,
		data: Prisma.UserUpdateInput
	): Promise<User> {
		return prisma.user.update({
			where: { id },
			data,
		});
	}

	static async updateLastLogin(id: string): Promise<User> {
		return prisma.user.update({
			where: { id },
			data: { lastLoginAt: new Date() },
		});
	}

	static async delete(id: string): Promise<User> {
		return prisma.user.delete({
			where: { id },
		});
	}

	static async existsByEmail(email: string): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { email },
			select: { id: true },
		});
		return !!user;
	}

	static async existsByUsername(username: string): Promise<boolean> {
		const user = await prisma.user.findUnique({
			where: { username },
			select: { id: true },
		});
		return !!user;
	}

	// Admin methods - can access inactive users
	static async findByEmailIncludeInactive(
		email: string
	): Promise<User | null> {
		return prisma.user.findUnique({
			where: { email },
		});
	}

	static async findByIdIncludeInactive(id: string): Promise<User | null> {
		return prisma.user.findUnique({
			where: { id },
		});
	}

	static async deactivateUser(id: string): Promise<User> {
		return prisma.user.update({
			where: { id },
			data: { isActive: false },
		});
	}

	static async activateUser(id: string): Promise<User> {
		return prisma.user.update({
			where: { id },
			data: { isActive: true },
		});
	}

	// Helper: Generate username from email
	private static generateUsernameFromEmail(email: string): string {
		const emailParts = email.split("@");
		const base = (emailParts[0] || "user").toLowerCase();
		const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
		return `${base}${randomSuffix}`;
	}
}
