import { httpClient } from "./http";

export class UserApiService {
	static list(accessToken: string, adminToken?: string) {
		return httpClient.get<{
			users: Array<{ id: string; email: string; username: string }>;
		}>(`/users`, {
			Authorization: `Bearer ${accessToken}`,
			...(adminToken ? { "x-admin-token": adminToken } : {}),
		});
	}
}
