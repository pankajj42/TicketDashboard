import { API_CONFIG } from "@/lib/constants";

export class ApiError extends Error {
	public code?: string;
	public status: number;
	public details?: any;
	constructor(message: string, status: number, code?: string, details?: any) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export class HttpClient {
	private baseURL: string;
	constructor(baseURL: string) {
		this.baseURL = baseURL;
	}
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseURL}${endpoint}`;
		const config: RequestInit = {
			credentials: "include",
			...options,
			headers: {
				"Content-Type": "application/json",
				...(options.headers || {}),
			},
		};
		const res = await fetch(url, config);
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new ApiError(
				data?.error || "Request failed",
				res.status,
				data?.code,
				data?.details
			);
		}
		return data as T;
	}
	get<T>(endpoint: string, headers?: Record<string, string>) {
		return this.request<T>(endpoint, { method: "GET", headers });
	}
	post<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
		return this.request<T>(endpoint, {
			method: "POST",
			body: JSON.stringify(body || {}),
			headers,
		});
	}
	delete<T>(endpoint: string, headers?: Record<string, string>) {
		return this.request<T>(endpoint, { method: "DELETE", headers });
	}
	patch<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
		return this.request<T>(endpoint, {
			method: "PATCH",
			body: JSON.stringify(body || {}),
			headers,
		});
	}
}

export const httpClient = new HttpClient(`${API_CONFIG.BASE_URL}/api`);
