import { httpClient } from "./http";
import type {
	CreateTicketInput,
	UpdateTicketDetailsInput,
	ChangeTicketStatusInput,
} from "@repo/shared";

export class TicketApiService {
	static create(
		projectId: string,
		body: CreateTicketInput,
		accessToken: string
	) {
		return httpClient.post<{ ticket: any }>(
			`/projects/${projectId}/tickets`,
			body,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}
	static list(projectId: string, accessToken: string) {
		return httpClient.get<{
			tickets: Array<{
				id: string;
				title: string;
				description: string;
				status: string;
			}>;
		}>(`/projects/${projectId}/tickets`, {
			Authorization: `Bearer ${accessToken}`,
		});
	}
	static updateDetails(
		ticketId: string,
		body: UpdateTicketDetailsInput,
		accessToken: string
	) {
		return httpClient.patch<{ ticket: any }>(`/tickets/${ticketId}`, body, {
			Authorization: `Bearer ${accessToken}`,
		});
	}
	static changeStatus(
		ticketId: string,
		body: ChangeTicketStatusInput,
		accessToken: string
	) {
		return httpClient.patch<{ ticket: any }>(
			`/tickets/${ticketId}/status`,
			body,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}

	static assign(
		ticketId: string,
		body: { userId?: string | null },
		accessToken: string
	) {
		return httpClient.patch<{ ticket: any }>(
			`/tickets/${ticketId}/assignee`,
			body,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}

	static assignAndStatus(
		ticketId: string,
		body: {
			userId?: string | null;
			status?: "PROPOSED" | "TODO" | "INPROGRESS" | "DONE" | "DEPLOYED";
		},
		accessToken: string
	) {
		return httpClient.patch<{ ticket: any }>(
			`/tickets/${ticketId}/assignee-status`,
			body,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}

	static listCreated(accessToken: string) {
		return httpClient.get<{
			tickets: Array<{
				id: string;
				title: string;
				description: string;
				status: string;
				project: { id: string; name: string };
			}>;
		}>(`/tickets/created`, { Authorization: `Bearer ${accessToken}` });
	}

	static listAssigned(accessToken: string) {
		return httpClient.get<{
			tickets: Array<{
				id: string;
				title: string;
				description: string;
				status: string;
				project: { id: string; name: string };
			}>;
		}>(`/tickets/assigned`, { Authorization: `Bearer ${accessToken}` });
	}
}
