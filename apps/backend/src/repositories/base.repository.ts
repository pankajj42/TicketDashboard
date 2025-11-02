import { PrismaClient } from "../generated/prisma/client.js";

export abstract class BaseRepository {
	protected prisma: PrismaClient;

	constructor(prismaClient: PrismaClient) {
		this.prisma = prismaClient;
		this.prisma.$connect();
	}

	protected handleError(error: unknown, operation: string): void {
		console.error(`Repository Error during ${operation}:`, error);
		throw error;
	}

	async disconnect(): Promise<void> {
		await this.prisma.$disconnect();
	}
}
