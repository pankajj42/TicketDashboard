import type { Project, Prisma, User } from "../generated/prisma/client.js";
import { BaseRepository } from "./base.repository.js";

export class ProjectRepository extends BaseRepository {
	static async create(
		data: Pick<Project, "name" | "description"> & { createdById?: string }
	): Promise<Project> {
		const createData: Prisma.ProjectCreateInput = {
			name: data.name,
			description: data.description ?? null,
		};
		return super.prisma.project.create({ data: createData });
	}

	static async findAll(): Promise<Project[]> {
		return super.prisma.project.findMany({
			orderBy: { createdAt: "desc" },
		});
	}

	static async findById(id: string): Promise<Project | null> {
		return super.prisma.project.findUnique({ where: { id } });
	}

	static async update(
		id: string,
		data: { name?: string; description?: string | null }
	): Promise<Project> {
		return super.prisma.project.update({ where: { id }, data });
	}

	static async subscribe(projectId: string, userId: string): Promise<void> {
		await super.prisma.project.update({
			where: { id: projectId },
			data: { subscribers: { connect: { id: userId } } },
		});
	}

	static async unsubscribe(projectId: string, userId: string): Promise<void> {
		await super.prisma.project.update({
			where: { id: projectId },
			data: { subscribers: { disconnect: { id: userId } } },
		});
	}

	static async getSubscribers(
		projectId: string
	): Promise<Pick<User, "id" | "email" | "username">[]> {
		const project = await super.prisma.project.findUnique({
			where: { id: projectId },
			select: {
				subscribers: {
					select: { id: true, email: true, username: true },
				},
			},
		});
		return project?.subscribers ?? [];
	}

	static async countSubscribers(projectId: string): Promise<number> {
		const res = await super.prisma.project.findUnique({
			where: { id: projectId },
			select: { _count: { select: { subscribers: true } } },
		});
		return (res as any)?._count?.subscribers ?? 0;
	}

	static async findSubscribedProjectIdsByUser(
		userId: string
	): Promise<string[]> {
		const rows = await super.prisma.project.findMany({
			where: { subscribers: { some: { id: userId } } },
			select: { id: true },
		});
		return rows.map((r) => r.id);
	}

	static async listWithSubscriptionFlag(userId: string): Promise<
		Array<{
			id: string;
			name: string;
			description: string | null;
			createdAt: Date;
			updatedAt: Date;
			isSubscribed: boolean;
			hasMyTickets: boolean;
			subscriberCount: number;
		}>
	> {
		const projects = await super.prisma.project.findMany({
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				name: true,
				description: true,
				createdAt: true,
				updatedAt: true,
				subscribers: { where: { id: userId }, select: { id: true } },
				tickets: {
					where: {
						OR: [{ createdById: userId }, { assignedToId: userId }],
					},
					select: { id: true },
					take: 1,
				},
				_count: { select: { subscribers: true } },
			},
		});
		return projects.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
			isSubscribed: (p.subscribers?.length ?? 0) > 0,
			hasMyTickets: (p as any).tickets?.length > 0,
			subscriberCount: (p as any)._count?.subscribers ?? 0,
		}));
	}
}
