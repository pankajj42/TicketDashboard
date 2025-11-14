import { useCallback, useEffect } from "react";
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
	useSetAdminElevation,
	useClearAdminElevation,
	useSetAdminExpiry,
} from "@/store/auth.store";
import { AuthApiService, ApiError } from "@/services/auth.api";
import { hashSha256Hex } from "@/lib/utils";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ROUTES } from "@/lib/constants";
import { getFriendlyErrorMessage } from "@/lib/error-codes";
import type { ApiUser } from "@repo/shared";
import { broadcast, subscribe } from "@/lib/broadcast";

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
	const setAdminElevation = useSetAdminElevation();
	const clearAdminElevation = useClearAdminElevation();
	const setAdminExpiry = useSetAdminExpiry();
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
				const apiErr = error as unknown as ApiError | undefined;
				const msg = getFriendlyErrorMessage(
					apiErr?.code,
					apiErr?.message || ERROR_MESSAGES.SERVER_ERROR,
					apiErr?.details
				);
				setError(msg);
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
				const apiErr = error as unknown as ApiError | undefined;
				const msg = getFriendlyErrorMessage(
					apiErr?.code,
					apiErr?.message ||
						"Failed to verify OTP. Please try again.",
					apiErr?.details
				);
				setError(msg);
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
					if (
						(userResponse as any).session?.isAdmin &&
						(userResponse as any).session?.adminExpiresAt
					) {
						setAdminExpiry(
							(userResponse as any).session.adminExpiresAt
						);
					} else {
						clearAdminElevation();
					}
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
				// Only call logout API if we have a valid access token
				// If token is expired/invalid, just clear local state
				if (accessToken) {
					try {
						await AuthApiService.logout(logoutAll, accessToken);
					} catch (logoutError) {
						// If logout fails due to invalid token, just continue with local cleanup
						console.error(
							"[auth] logout: server logout failed (token may be expired)",
							logoutError
						);
					}
				}

				clearAuth();
				clearAdminElevation();
				navigate(ROUTES.LOGIN, { replace: true });

				toast.success(
					logoutAll
						? SUCCESS_MESSAGES.LOGOUT_ALL_SUCCESS
						: SUCCESS_MESSAGES.LOGOUT_SUCCESS
				);
			} catch (error) {
				console.error("[auth] logout failed", error);
				// Even if logout fails on server, clear local auth state
				clearAuth();
				clearAdminElevation();
				navigate(ROUTES.LOGIN, { replace: true });

				// Don't show error for logout issues - user is trying to leave anyway
				toast.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
			}
		},
		[clearAuth, navigate, accessToken]
	);

	/**
	 * Elevate to admin (15 minutes)
	 */
	const elevateAdmin = useCallback(
		async (
			password: string
		): Promise<{ success: boolean; expiresAt?: string }> => {
			if (!accessToken) return { success: false };
			try {
				// Hash the password client-side (SHA-256 hex)
				const passwordHash = await hashSha256Hex(password);
				const response = await AuthApiService.elevateAdmin(
					accessToken,
					{ password: passwordHash }
				);
				setAdminElevation(response.adminToken, response.expiresAt);
				// Broadcast elevation to other tabs
				broadcast({
					type: "admin:elevated",
					adminExpiresAt: response.expiresAt,
				});
				toast.success("Admin access granted for 15 minutes");
				return { success: true, expiresAt: response.expiresAt };
			} catch (error) {
				const apiErr = error as ApiError | undefined;
				const msg = getFriendlyErrorMessage(
					apiErr?.code,
					apiErr?.message,
					apiErr?.details
				);
				toast.error(msg);
				return { success: false };
			}
		},
		[accessToken, setAdminElevation]
	);

	/**
	 * Revoke admin elevation immediately
	 */
	const revokeAdmin = useCallback(async (): Promise<boolean> => {
		if (!accessToken) return false;
		try {
			await AuthApiService.revokeAdmin(accessToken);
			clearAdminElevation();
			// Broadcast revoke to other tabs
			broadcast({ type: "admin:revoked" });
			toast.success("Admin access revoked");
			return true;
		} catch (error) {
			const apiErr = error as ApiError | undefined;
			const msg = getFriendlyErrorMessage(
				apiErr?.code,
				apiErr?.message,
				apiErr?.details
			);
			toast.error(msg);
			return false;
		}
	}, [accessToken, clearAdminElevation]);

	/**
	 * Get current user info (mainly for validation)
	 */
	const getCurrentUser = useCallback(async (): Promise<ApiUser | null> => {
		if (!accessToken) return null;

		try {
			const response = await AuthApiService.getCurrentUser(accessToken);
			if (
				(response as any).session?.isAdmin &&
				(response as any).session?.adminExpiresAt
			) {
				setAdminExpiry((response as any).session.adminExpiresAt);
			} else {
				clearAdminElevation();
			}
			return response.user;
		} catch (error) {
			console.error("[auth] getCurrentUser failed", error);
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
				// Local flows should not toggle global loading
				setError(null);

				// Call update profile API (we'll need to implement this)
				const response = await AuthApiService.updateProfile(
					updates,
					accessToken
				);

				if (response.success) {
					// Update the user in the store
					if (user) {
						const updatedUser = {
							...user,
							username: updates.username,
						};
						setAuth(updatedUser, accessToken);
						// Broadcast profile update
						broadcast({
							type: "user:profileUpdated",
							user: {
								username: updatedUser.username,
								email: updatedUser.email,
							},
						});
					}
					toast.success("Profile updated successfully");
					return true;
				}
				return false;
			} catch (error) {
				const apiErr = error as unknown as ApiError | undefined;
				const msg = getFriendlyErrorMessage(
					apiErr?.code,
					apiErr?.message || "Failed to update profile",
					apiErr?.details
				);
				setError(msg);
				toast.error(msg);
				return false;
			}
		},
		[accessToken, user, setAuth, setError]
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
			console.error("[auth] getDevices failed", error);
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
			}
		},
		[accessToken]
	);

	/**
	 * Logout from all devices
	 */
	const logoutFromAllDevices = useCallback(async (): Promise<number> => {
		if (!accessToken) return 0;

		try {
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
		}
	}, [accessToken, clearAuth, navigate]);

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
		elevateAdmin,
		revokeAdmin,
		clearError: () => setError(null),
		reset,
	};
};

// Subscription side-effect placed outside hook body would not have access to state; rely on consumer calling useAuth.
// Instead we export an internal effect hook to be used at app root.
export const useAuthBroadcastSync = () => {
	const setAuth = useSetAuth();
	const clearAdminElevation = useClearAdminElevation();
	const setAdminExpiry = useSetAdminExpiry();
	const accessToken = useAccessToken();
	const user = useUser();

	useEffect(() => {
		const unsubscribe = subscribe((ev) => {
			if (ev.type === "admin:elevated") {
				setAdminExpiry(ev.adminExpiresAt);
			}
			if (ev.type === "admin:revoked") {
				clearAdminElevation();
			}
			if (ev.type === "user:profileUpdated") {
				if (user && accessToken) {
					setAuth(
						{ ...user, username: ev.user.username },
						accessToken
					);
				}
			}
		});
		return () => unsubscribe();
	}, [setAdminExpiry, clearAdminElevation, setAuth, user, accessToken]);
};
