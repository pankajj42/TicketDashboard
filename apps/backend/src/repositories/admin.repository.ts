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
}
