import { httpClient } from "./http";
import type { CreateProjectInput } from "@repo/shared";

export class ProjectApiService {
	static list(accessToken: string) {
		return httpClient.get<{
			projects: Array<{
				id: string;
				name: string;
				description?: string | null;
				isSubscribed?: boolean;
			}>;
		}>(`/projects`, { Authorization: `Bearer ${accessToken}` });
	}
	static create(project: CreateProjectInput, accessToken: string) {
		return httpClient.post<{ project: { id: string } }>(
			`/projects`,
			project,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}
	static subscribe(projectId: string, accessToken: string) {
		return httpClient.post<{ success: boolean }>(
			`/projects/${projectId}/subscribe`,
			{},
			{ Authorization: `Bearer ${accessToken}` }
		);
	}
	static unsubscribe(projectId: string, accessToken: string) {
		return httpClient.delete<{ success: boolean }>(
			`/projects/${projectId}/subscribe`,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}

	static update(
		projectId: string,
		body: { name?: string; description?: string | null },
		accessToken: string
	) {
		return httpClient.patch<{ project: any }>(
			`/projects/${projectId}`,
			body,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}

	static getSubscribers(projectId: string, accessToken: string) {
		return httpClient.get<{
			users: Array<{ id: string; email: string; username: string }>;
		}>(`/projects/${projectId}/subscribers`, {
			Authorization: `Bearer ${accessToken}`,
		});
	}
}
