import type { RefreshToken, Prisma } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

export class SessionRepository extends BaseRepository {
	static async createRefreshToken(
		data: Prisma.RefreshTokenCreateInput
	): Promise<RefreshToken> {
		return super.prisma.refreshToken.create({ data });
	}

	static async findRefreshToken(
		token: string
	): Promise<(RefreshToken & { user: any }) | null> {
		return super.prisma.refreshToken.findUnique({
			where: { token },
			include: { user: true },
		});
	}

	static async findUserSessions(userId: string): Promise<RefreshToken[]> {
		return super.prisma.refreshToken.findMany({
			where: {
				userId,
				expiresAt: { gt: new Date() },
			},
			orderBy: { lastUsed: "desc" },
		});
	}

	static async findById(sessionId: string): Promise<RefreshToken | null> {
		return super.prisma.refreshToken.findFirst({
			where: { sessionId },
			include: { user: true },
		});
	}

	static async updateLastUsed(token: string): Promise<any> {
		return super.prisma.refreshToken.update({
			where: { token },
			data: { lastUsed: new Date() },
		});
	}

	static async deactivateByToken(token: string): Promise<number> {
		const result = await super.prisma.refreshToken.deleteMany({
			where: { token },
		});
		return result.count;
	}
	static async deactivateAllForUser(userId: string): Promise<number> {
		const result = await super.prisma.refreshToken.deleteMany({
			where: { userId },
		});
		return result.count;
	}

	static async deleteSessionById(
		userId: string,
		sessionId: string
	): Promise<number> {
		const result = await super.prisma.refreshToken.deleteMany({
			where: {
				userId,
				sessionId,
			},
		});
		return result.count;
	}

	static async cleanupExpiredSessions(): Promise<number> {
		const result = await super.prisma.refreshToken.deleteMany({
			where: {
				expiresAt: { lt: new Date() },
			},
		});
		return result.count;
	}
}
