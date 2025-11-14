import { httpClient } from "./http";
import type { CreateCommentInput } from "@repo/shared";

export class CommentApiService {
	static add(
		ticketId: string,
		body: CreateCommentInput,
		accessToken: string
	) {
		return httpClient.post<{ comment: any }>(
			`/tickets/${ticketId}/comments`,
			body,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}
	static list(
		ticketId: string,
		accessToken: string,
		limit = 50,
		cursor?: string
	) {
		const q = new URLSearchParams({
			limit: String(limit),
			...(cursor ? { cursor } : {}),
		});
		return httpClient.get<{ comments: any[] }>(
			`/tickets/${ticketId}/comments?${q.toString()}`,
			{ Authorization: `Bearer ${accessToken}` }
		);
	}
}
