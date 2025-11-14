import { httpClient } from "./http";

export class NotificationApiService {
	static list(accessToken: string, unreadOnly = false) {
		return httpClient.get<{
			notifications: Array<{
				id: string;
				message: string;
				read: boolean;
				createdAt: string;
			}>;
		}>(`/notifications?unreadOnly=${unreadOnly}`, {
			Authorization: `Bearer ${accessToken}`,
		});
	}
	static markAllRead(accessToken: string) {
		return httpClient.post<{ success: boolean; count: number }>(
			`/notifications/mark-all-read`,
			{},
			{ Authorization: `Bearer ${accessToken}` }
		);
	}
}
