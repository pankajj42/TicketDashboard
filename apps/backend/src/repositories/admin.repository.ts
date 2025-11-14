import type { AdminElevation, Prisma } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

export class AdminRepository extends BaseRepository {
	static async createElevation(data: Prisma.AdminElevationCreateInput) {
		return super.prisma.adminElevation.create({ data });
	}

	static async revokeElevationById(id: string) {
		return super.prisma.adminElevation.update({
			where: { id },
			data: { revokedAt: new Date() },
		});
	}

	static async findActiveByUser(userId: string) {
		return super.prisma.adminElevation.findFirst({
			where: {
				userId,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
			orderBy: { issuedAt: "desc" },
		});
	}

	static async findActiveByUserAndSession(userId: string, sessionId: string) {
		return super.prisma.adminElevation.findFirst({
			where: {
				userId,
				sessionId,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
			orderBy: { issuedAt: "desc" },
		});
	}

	// Transactional operations for admin elevation lifecycle
	static async elevateWithTransaction(params: {
		userId: string;
		sessionId: string;
		jti: string;
		expiresAt: Date;
		ipAddress?: string;
		userAgent?: string;
	}): Promise<AdminElevation> {
		return await super.prisma.$transaction(async (tx) => {
			await tx.refreshToken.deleteMany({
				where: {
					userId: params.userId,
					sessionId: { not: params.sessionId },
				},
			});
			const elevation = await tx.adminElevation.create({
				data: {
					user: { connect: { id: params.userId } },
					sessionId: params.sessionId,
					jti: params.jti,
					expiresAt: params.expiresAt,
					ipAddress: params.ipAddress,
					userAgent: params.userAgent,
				},
			});
			await tx.user.update({
				where: { id: params.userId },
				data: {
					adminElevatedSessionId: params.sessionId,
					adminElevatedUntil: params.expiresAt,
				},
			});
			return elevation;
		});
	}

	static async revokeWithTransaction(params: {
		userId: string;
		elevationId: string;
	}): Promise<void> {
		await super.prisma.$transaction(async (tx) => {
			await tx.adminElevation.update({
				where: { id: params.elevationId },
				data: { revokedAt: new Date() },
			});
			await tx.user.update({
				where: { id: params.userId },
				data: {
					adminElevatedSessionId: null,
					adminElevatedUntil: null,
				},
			});
		});
	}
}
