import type {
	LoginRequest,
	LoginResponse,
	VerifyOtpRequest,
	VerifyOtpResponse,
	RefreshTokenResponse,
	LogoutRequest,
	LogoutResponse,
	GetDevicesResponse,
	LogoutDeviceResponse,
	GetCurrentUserResponse,
	ApiErrorResponse,
	ApiUser,
	UpdateProfileRequest,
} from "@repo/shared";
import { API_CONFIG } from "@/lib/constants";

// Custom error class for API errors
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

// HTTP client with error handling
class HttpClient {
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
			credentials: "include", // Include cookies for refresh tokens
			...options,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
		};

		// Retry with basic backoff and timeout support
		let attempt = 0;
		let lastError: unknown;

		while (attempt < API_CONFIG.MAX_RETRY_ATTEMPTS) {
			const controller = new AbortController();
			const timeout = setTimeout(
				() => controller.abort(),
				API_CONFIG.TIMEOUT
			);

			try {
				const response = await fetch(url, {
					...config,
					signal: controller.signal,
				});
				clearTimeout(timeout);

				const data = await response.json();

				if (!response.ok) {
					const errorData = data as ApiErrorResponse;
					// Retry only on transient errors
					if (
						response.status >= 500 ||
						response.status === 429 ||
						response.status === 408
					) {
						attempt++;
						if (attempt < API_CONFIG.MAX_RETRY_ATTEMPTS) {
							await new Promise((r) =>
								setTimeout(r, API_CONFIG.RETRY_DELAY_MS)
							);
							continue;
						}
					}

					throw new ApiError(
						errorData.error || "An error occurred",
						response.status,
						errorData.code,
						errorData.details
					);
				}

				return data as T;
			} catch (error) {
				clearTimeout(timeout);
				lastError = error;
				// AbortError or network error: retry
				if (
					(error as any)?.name === "AbortError" ||
					(error instanceof TypeError &&
						error.message.includes("fetch"))
				) {
					attempt++;
					if (attempt < API_CONFIG.MAX_RETRY_ATTEMPTS) {
						await new Promise((r) =>
							setTimeout(r, API_CONFIG.RETRY_DELAY_MS)
						);
						continue;
					}
				}

				if (error instanceof ApiError) throw error;

				// Fallthrough after retries exhausted
				if (
					error instanceof TypeError &&
					error.message.includes("fetch")
				) {
					throw new ApiError(
						"Network error. Please check your connection.",
						0
					);
				}

				throw new ApiError("An unexpected error occurred", 500);
			}
		}

		// If loop exits without return, throw last error
		throw lastError instanceof Error
			? lastError
			: new ApiError("Request failed", 500);
	}

	async get<T>(
		endpoint: string,
		headers?: Record<string, string>
	): Promise<T> {
		return this.request<T>(endpoint, { method: "GET", headers });
	}

	async post<T>(
		endpoint: string,
		body?: any,
		headers?: Record<string, string>
	): Promise<T> {
		return this.request<T>(endpoint, {
			method: "POST",
			body: JSON.stringify(body || {}), // Always send at least empty object
			headers,
		});
	}

	async delete<T>(
		endpoint: string,
		headers?: Record<string, string>
	): Promise<T> {
		return this.request<T>(endpoint, { method: "DELETE", headers });
	}

	async put<T>(
		endpoint: string,
		body?: any,
		headers?: Record<string, string>
	): Promise<T> {
		return this.request<T>(endpoint, {
			method: "PUT",
			body: JSON.stringify(body || {}),
			headers,
		});
	}
}

// Create HTTP client instance
const httpClient = new HttpClient(API_CONFIG.BASE_URL);

// Device info helper
const getDeviceInfo = () => {
	return {
		userAgent: navigator.userAgent,
		deviceName:
			`${navigator.platform} - ${navigator.userAgent.split(" ").pop()}`.substring(
				0,
				100
			),
	};
};

// Authentication API service
export class AuthApiService {
	/**
	 * Send OTP to email for login
	 */
	static async sendOtp(email: string): Promise<LoginResponse> {
		const request: LoginRequest = { email };
		return httpClient.post<LoginResponse>(
			`${API_CONFIG.PREFIX}/login`,
			request
		);
	}

	/**
	 * Verify OTP and authenticate user
	 */
	static async verifyOtp(
		email: string,
		otp: string
	): Promise<VerifyOtpResponse> {
		const request: VerifyOtpRequest = {
			email,
			otp,
			deviceInfo: getDeviceInfo(),
		};
		return httpClient.post<VerifyOtpResponse>(
			`${API_CONFIG.PREFIX}/verify-otp`,
			request
		);
	}

	/**
	 * Refresh access token using HTTP-only refresh token cookie
	 */
	static async refreshToken(): Promise<RefreshTokenResponse> {
		return httpClient.post<RefreshTokenResponse>(
			`${API_CONFIG.PREFIX}/refresh`
		);
	}

	/**
	 * Logout from current device or all devices
	 */
	static async logout(
		logoutAll: boolean = false,
		accessToken?: string
	): Promise<LogoutResponse> {
		const request: LogoutRequest = { logoutAll };
		const headers = accessToken
			? { Authorization: `Bearer ${accessToken}` }
			: undefined;

		return httpClient.post<LogoutResponse>(
			`${API_CONFIG.PREFIX}/logout`,
			request,
			headers
		);
	}

	/**
	 * Get current user information
	 */
	static async getCurrentUser(
		accessToken: string
	): Promise<GetCurrentUserResponse> {
		return httpClient.get<GetCurrentUserResponse>(
			`${API_CONFIG.PREFIX}/me`,
			{
				Authorization: `Bearer ${accessToken}`,
			}
		);
	}

	/**
	 * Get user's active devices
	 */
	static async getDevices(accessToken: string): Promise<GetDevicesResponse> {
		return httpClient.get<GetDevicesResponse>(
			`${API_CONFIG.PREFIX}/devices`,
			{
				Authorization: `Bearer ${accessToken}`,
			}
		);
	}

	/**
	 * Logout from specific device
	 */
	static async logoutDevice(
		sessionId: string,
		accessToken: string
	): Promise<LogoutDeviceResponse> {
		return httpClient.delete<LogoutDeviceResponse>(
			`${API_CONFIG.PREFIX}/devices/${sessionId}`,
			{
				Authorization: `Bearer ${accessToken}`,
			}
		);
	}

	/**
	 * Update user profile
	 */
	static async updateProfile(
		updates: UpdateProfileRequest,
		accessToken: string
	): Promise<{ success: boolean; user?: ApiUser }> {
		return httpClient.put<{ success: boolean; user?: ApiUser }>(
			`${API_CONFIG.PREFIX}/profile`,
			updates,
			{
				Authorization: `Bearer ${accessToken}`,
			}
		);
	}
}
