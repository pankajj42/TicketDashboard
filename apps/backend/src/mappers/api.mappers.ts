import type {
	User as PrismaUser,
	RefreshToken as PrismaRefreshToken,
} from "../generated/prisma/client.js";
import type { ApiUser, ApiDeviceInfo } from "@repo/shared";

/**
 * Mappers to convert between Prisma types and API response types
 * This prevents exposing internal database fields and allows clean API contracts
 */

export class UserMapper {
	// Convert Prisma User to clean API User response
	static toApiUser(prismaUser: PrismaUser): ApiUser {
		return {
			id: prismaUser.id,
			email: prismaUser.email,
			username: prismaUser.username,
		};
	}

	// Convert multiple Prisma Users to API Users
	static toApiUsers(prismaUsers: PrismaUser[]): ApiUser[] {
		return prismaUsers.map(this.toApiUser);
	}
}

export class DeviceMapper {
	// Convert Prisma RefreshToken to API DeviceInfo
	static toApiDeviceInfo(refreshToken: PrismaRefreshToken): ApiDeviceInfo {
		return {
			id: refreshToken.sessionId,
			deviceName: refreshToken.deviceName || "Unknown Device",
			userAgent: refreshToken.userAgent,
			ipAddress: refreshToken.ipAddress,
			lastUsed: refreshToken.lastUsed,
			createdAt: refreshToken.createdAt,
		};
	}

	// Convert multiple refresh tokens to device info
	static toApiDeviceInfoList(
		refreshTokens: PrismaRefreshToken[]
	): ApiDeviceInfo[] {
		return refreshTokens.map(this.toApiDeviceInfo);
	}
}
