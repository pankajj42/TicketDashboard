import { prisma } from "../lib/prisma.js";

export abstract class BaseRepository {
	protected static get prisma() {
		return prisma;
	}

	protected static handleError(error: unknown, operation: string): void {
		console.error(`Repository Error during ${operation}:`, error);
		throw error;
	}
}
