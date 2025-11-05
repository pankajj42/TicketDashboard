import type { RefreshToken, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

export class SessionRepository {
	static async createRefreshToken(
		data: Prisma.RefreshTokenCreateInput
	): Promise<RefreshToken> {
		return prisma.refreshToken.create({ data });
	}

	static async findRefreshToken(token: string): Promise<RefreshToken | null> {
		return prisma.refreshToken.findUnique({
			where: { token },
			include: { user: true },
		});
	}

	static async findUserSessions(userId: string): Promise<RefreshToken[]> {
		return prisma.refreshToken.findMany({
			where: {
				userId,
				expiresAt: { gt: new Date() },
			},
			orderBy: { lastUsed: "desc" },
		});
	}

	static async findById(sessionId: string): Promise<RefreshToken | null> {
		return prisma.refreshToken.findFirst({
			where: { sessionId },
			include: { user: true },
		});
	}

	static async updateLastUsed(sessionId: string): Promise<RefreshToken> {
		return prisma.refreshToken.updateMany({
			where: { sessionId },
			data: { lastUsed: new Date() },
		}) as any; // Return type simplification
	}

	static async deactivate(sessionId: string): Promise<number> {
		const result = await prisma.refreshToken.deleteMany({
			where: { sessionId },
		});
		return result.count;
	}
	static async deactivateAllForUser(userId: string): Promise<number> {
		const result = await prisma.refreshToken.deleteMany({
			where: { userId },
		});
		return result.count;
	}

	static async deleteSessionById(
		userId: string,
		sessionId: string
	): Promise<number> {
		const result = await prisma.refreshToken.deleteMany({
			where: {
				userId,
				sessionId,
			},
		});
		return result.count;
	}

	static async cleanupExpiredSessions(): Promise<number> {
		const result = await prisma.refreshToken.deleteMany({
			where: {
				expiresAt: { lt: new Date() },
			},
		});
		return result.count;
	}
}
