import type { User, Prisma } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";
import crypto from "crypto";

export class UserRepository extends BaseRepository {
	static async findByEmail(email: string): Promise<User | null> {
		return super.prisma.user.findUnique({
			where: {
				email,
				isActive: true, // Only return active users
			},
		});
	}

	static async findById(id: string): Promise<User | null> {
		return super.prisma.user.findUnique({
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

		return super.prisma.user.create({ data });
	}

	static async update(
		id: string,
		data: Prisma.UserUpdateInput
	): Promise<User> {
		return super.prisma.user.update({
			where: { id },
			data,
		});
	}

	static async updateLastLogin(id: string): Promise<User> {
		return super.prisma.user.update({
			where: { id },
			data: { lastLoginAt: new Date() },
		});
	}

	static async updateProfile(
		id: string,
		updates: { username: string }
	): Promise<User | null> {
		try {
			return await super.prisma.user.update({
				where: {
					id,
					isActive: true,
				},
				data: {
					username: updates.username,
					updatedAt: new Date(),
				},
			});
		} catch (error: any) {
			// Check for Prisma unique constraint violation
			if (
				error.code === "P2002" &&
				error.meta?.target?.includes("username")
			) {
				// Don't log this as it's expected business logic (username conflict)
				// Re-throw with a more specific error for username uniqueness
				const uniqueError = new Error("Username already exists");
				(uniqueError as any).code = "USERNAME_EXISTS";
				throw uniqueError;
			}

			// Log unexpected database errors
			console.error("Unexpected error updating user profile:", error);
			// Re-throw other errors to be handled by the service layer
			throw error;
		}
	}

	static async delete(id: string): Promise<User> {
		return super.prisma.user.delete({
			where: { id },
		});
	}

	static async findAllActiveLite(): Promise<
		Array<{ id: string; email: string; username: string }>
	> {
		const users = await super.prisma.user.findMany({
			where: { isActive: true },
			select: { id: true, email: true, username: true },
		});
		return users;
	}

	static async existsByEmail(email: string): Promise<boolean> {
		const user = await super.prisma.user.findUnique({
			where: { email },
			select: { id: true },
		});
		return !!user;
	}

	// Helper: Generate username from email
	private static generateUsernameFromEmail(email: string): string {
		const emailParts = email.split("@");
		const base = (emailParts[0] || "user").toLowerCase();
		const randomSuffix = crypto.randomInt(1000, 9999);
		return `${base}${randomSuffix}`;
	}
}
