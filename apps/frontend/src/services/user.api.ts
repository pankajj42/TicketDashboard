import { httpClient } from "./http";

export class UserApiService {
	static list(accessToken: string) {
		return httpClient.get<{
			users: Array<{ id: string; email: string; username: string }>;
		}>(`/users`, { Authorization: `Bearer ${accessToken}` });
	}
}
