import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
	useIsAuthenticated,
	useUser,
	useAccessToken,
	useIsLoading,
	useIsRefreshing,
	useAuthError,
	useSetAuth,
	useSetAccessToken,
	useSetLoading,
	useSetRefreshing,
	useSetError,
	useClearAuth,
	useResetAuth,
} from "@/store/auth.store";
import { AuthApiService, ApiError } from "@/services/auth.api";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ROUTES } from "@/lib/constants";
import type { ApiUser } from "@repo/shared";

export const useAuth = () => {
	const navigate = useNavigate();
	const isAuthenticated = useIsAuthenticated();
	const user = useUser();
	const accessToken = useAccessToken();
	const isLoading = useIsLoading();
	const isRefreshing = useIsRefreshing();
	const error = useAuthError();
	const setAuth = useSetAuth();
	const setAccessToken = useSetAccessToken();
	const setLoading = useSetLoading();
	const setRefreshing = useSetRefreshing();
	const setError = useSetError();
	const clearAuth = useClearAuth();
	const reset = useResetAuth();

	/**
	 * Send OTP to email for login with timing information
	 */
	const sendOtp = useCallback(
		async (
			email: string
		): Promise<{ success: boolean; expiresIn?: number }> => {
			try {
				setError(null);
				setLoading(true);

				const response = await AuthApiService.sendOtp(email);

				if (response.success && response.data?.otpSent) {
					toast.success(response.message);
					return {
						success: true,
						expiresIn: response.data?.timing?.expiresIn,
					};
				}
				return { success: false };
			} catch (error) {
				const errorMessage =
					error instanceof ApiError
						? error.message
						: ERROR_MESSAGES.SERVER_ERROR;

				setError(errorMessage);
				return { success: false };
			} finally {
				setLoading(false);
			}
		},
		[setError, setLoading]
	);

	/**
	 * Verify OTP and authenticate user
	 */
	const verifyOtp = useCallback(
		async (email: string, otp: string): Promise<boolean> => {
			try {
				setError(null);
				setLoading(true);

				const response = await AuthApiService.verifyOtp(email, otp);

				if (
					response.success &&
					response.data?.user &&
					response.data?.accessToken
				) {
					setAuth(response.data.user, response.data.accessToken);
					toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS);

					// Navigate to dashboard after successful login
					navigate(ROUTES.DASHBOARD, { replace: true });
					return true;
				}
				return false;
			} catch (error) {
				const errorMessage =
					error instanceof ApiError
						? error.message
						: "Failed to verify OTP. Please try again.";

				setError(errorMessage);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[setError, setLoading, setAuth, navigate]
	);

	/**
	 * Refresh access token and restore user session
	 */
	const refreshToken = useCallback(async (): Promise<boolean> => {
		try {
			setRefreshing(true);

			const response = await AuthApiService.refreshToken();

			if (response.accessToken) {
				// Get user data with the new access token
				try {
					const userResponse = await AuthApiService.getCurrentUser(
						response.accessToken
					);
					// Set full authentication state
					setAuth(userResponse.user, response.accessToken);
					return true;
				} catch (userError) {
					console.error(
						"Failed to get user data after refresh:",
						userError
					);
					// Still set the token, but without user data
					setAccessToken(response.accessToken);
					return true;
				}
			}

			return false;
		} catch (error) {
			console.error("Token refresh failed:", error);
			clearAuth();
			return false;
		} finally {
			setRefreshing(false);
		}
	}, [setRefreshing, setAccessToken, setAuth, clearAuth]);

	/**
	 * Logout user from current device or all devices
	 */
	const logout = useCallback(
		async (logoutAll: boolean = false): Promise<void> => {
			try {
				setLoading(true);

				// Only call logout API if we have a valid access token
				// If token is expired/invalid, just clear local state
				if (accessToken) {
					try {
						await AuthApiService.logout(logoutAll, accessToken);
					} catch (logoutError) {
						// If logout fails due to invalid token, just continue with local cleanup
						console.log(
							"Server logout failed (token may be expired), continuing with local cleanup:",
							logoutError
						);
					}
				}

				clearAuth();
				navigate(ROUTES.LOGIN, { replace: true });

				toast.success(
					logoutAll
						? SUCCESS_MESSAGES.LOGOUT_ALL_SUCCESS
						: SUCCESS_MESSAGES.LOGOUT_SUCCESS
				);
			} catch (error) {
				console.error("Logout failed:", error);
				// Even if logout fails on server, clear local auth state
				clearAuth();
				navigate(ROUTES.LOGIN, { replace: true });

				// Don't show error for logout issues - user is trying to leave anyway
				toast.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
			} finally {
				setLoading(false);
			}
		},
		[setLoading, clearAuth, navigate, accessToken]
	);

	/**
	 * Get current user info (mainly for validation)
	 */
	const getCurrentUser = useCallback(async (): Promise<ApiUser | null> => {
		if (!accessToken) return null;

		try {
			const response = await AuthApiService.getCurrentUser(accessToken);
			return response.user;
		} catch (error) {
			console.error("Get current user failed:", error);
			if (error instanceof ApiError && error.status === 401) {
				// Try to refresh token
				const refreshed = await refreshToken();
				if (!refreshed) {
					clearAuth();
					navigate("/login", { replace: true });
				}
			}
			return null;
		}
	}, [accessToken, refreshToken, clearAuth, navigate]);

	/**
	 * Check if user is authenticated and token is valid
	 */
	const checkAuth = useCallback(async (): Promise<boolean> => {
		if (!isAuthenticated || !accessToken) {
			return false;
		}

		try {
			await AuthApiService.getCurrentUser(accessToken);
			return true;
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) {
				// Try to refresh token
				const refreshed = await refreshToken();
				return refreshed;
			}
			return false;
		}
	}, [isAuthenticated, accessToken, refreshToken]);

	/**
	 * Update user profile information
	 */
	const updateProfile = useCallback(
		async (updates: { username: string }): Promise<boolean> => {
			if (!accessToken) return false;

			try {
				setLoading(true);
				setError(null);

				// Call update profile API (we'll need to implement this)
				const response = await AuthApiService.updateProfile(
					updates,
					accessToken
				);

				if (response.success) {
					// Update the user in the store
					if (user) {
						setAuth(
							{ ...user, username: updates.username },
							accessToken
						);
					}
					toast.success("Profile updated successfully");
					return true;
				}
				return false;
			} catch (error) {
				const errorMessage =
					error instanceof ApiError
						? error.message
						: "Failed to update profile";
				setError(errorMessage);
				toast.error(errorMessage);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[accessToken, user, setAuth, setLoading, setError]
	);

	/**
	 * Get user's active devices
	 */
	const getUserDevices = useCallback(async (): Promise<any[]> => {
		if (!accessToken) return [];

		try {
			const response = await AuthApiService.getDevices(accessToken);
			return response.devices || [];
		} catch (error) {
			console.error("Failed to get devices:", error);
			if (error instanceof ApiError && error.status === 401) {
				// Try to refresh token
				const refreshed = await refreshToken();
				if (!refreshed) {
					clearAuth();
					navigate("/login", { replace: true });
				}
			}
			return [];
		}
	}, [accessToken, refreshToken, clearAuth, navigate]);

	/**
	 * Logout from specific device
	 */
	const logoutFromDevice = useCallback(
		async (sessionId: string): Promise<boolean> => {
			if (!accessToken) return false;

			try {
				setLoading(true);
				const response = await AuthApiService.logoutDevice(
					sessionId,
					accessToken
				);

				if (response.success) {
					toast.success("Device signed out successfully");
					return true;
				}
				return false;
			} catch (error) {
				const errorMessage =
					error instanceof ApiError
						? error.message
						: "Failed to sign out device";
				toast.error(errorMessage);
				return false;
			} finally {
				setLoading(false);
			}
		},
		[accessToken, setLoading]
	);

	/**
	 * Logout from all devices
	 */
	const logoutFromAllDevices = useCallback(async (): Promise<number> => {
		if (!accessToken) return 0;

		try {
			setLoading(true);
			const response = await AuthApiService.logout(true, accessToken);

			if (response.loggedOutDevices > 0) {
				toast.success(
					`Signed out from ${response.loggedOutDevices} device(s)`
				);
				// Clear auth state and redirect to login
				clearAuth();
				navigate("/login", { replace: true });
			}

			return response.loggedOutDevices;
		} catch (error) {
			const errorMessage =
				error instanceof ApiError
					? error.message
					: "Failed to sign out from all devices";
			toast.error(errorMessage);
			return 0;
		} finally {
			setLoading(false);
		}
	}, [accessToken, setLoading, clearAuth, navigate]);

	return {
		// State
		isAuthenticated,
		user,
		accessToken,

		// Loading states
		isLoading,
		isRefreshing,
		error,

		// Actions
		sendOtp,
		verifyOtp,
		refreshToken,
		logout,
		getCurrentUser,
		checkAuth,
		updateProfile,
		getUserDevices,
		logoutFromDevice,
		logoutFromAllDevices,
		clearError: () => setError(null),
		reset,
	};
};
