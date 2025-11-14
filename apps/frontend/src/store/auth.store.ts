import { create } from "zustand";
import type { ApiUser } from "@repo/shared";

export interface AuthState {
	// Authentication state
	isAuthenticated: boolean;
	user: ApiUser | null;
	accessToken: string | null;

	// Admin elevation state
	isAdminElevated?: boolean;
	adminToken?: string | null;
	adminExpiresAt?: string | null; // ISO string

	// Loading states
	isLoading: boolean;
	isRefreshing: boolean;

	// Error state
	error: string | null;

	// Actions
	setAuth: (user: ApiUser, accessToken: string) => void;
	setAccessToken: (token: string) => void;
	setAdminElevation: (token: string, expiresAt: string) => void;
	clearAdminElevation: () => void;
	setAdminExpiry: (expiresAt: string) => void;
	setLoading: (loading: boolean) => void;
	setRefreshing: (refreshing: boolean) => void;
	setError: (error: string | null) => void;
	clearAuth: () => void;
	reset: () => void;
}

const initialState = {
	isAuthenticated: false,
	user: null,
	accessToken: null,
	isAdminElevated: false,
	adminToken: null,
	adminExpiresAt: null,
	isLoading: false,
	isRefreshing: false,
	error: null,
};

export const useAuthStore = create<AuthState>()((set) => ({
	...initialState,

	setAuth: (user: ApiUser, accessToken: string) => {
		set({
			isAuthenticated: true,
			user,
			accessToken,
			error: null,
		});
	},

	setAccessToken: (accessToken: string) => {
		set({ accessToken });
	},

	setAdminElevation: (token: string, expiresAt: string) => {
		set({
			isAdminElevated: true,
			adminToken: token,
			adminExpiresAt: expiresAt,
		});
	},

	clearAdminElevation: () => {
		set({ isAdminElevated: false, adminToken: null, adminExpiresAt: null });
	},

	setAdminExpiry: (expiresAt: string) => {
		set({ isAdminElevated: true, adminExpiresAt: expiresAt });
	},

	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},

	setRefreshing: (isRefreshing: boolean) => {
		set({ isRefreshing });
	},

	setError: (error: string | null) => {
		set({ error });
	},

	clearAuth: () => {
		set({
			isAuthenticated: false,
			user: null,
			accessToken: null,
			isAdminElevated: false,
			adminToken: null,
			adminExpiresAt: null,
			error: null,
		});
	},

	reset: () => {
		set(initialState);
	},
}));

// Individual selectors to avoid object creation and infinite loops
export const useIsAuthenticated = () =>
	useAuthStore((state) => state.isAuthenticated);
export const useUser = () => useAuthStore((state) => state.user);
export const useAccessToken = () => useAuthStore((state) => state.accessToken);
export const useIsAdminElevated = () =>
	useAuthStore((state) => state.isAdminElevated);
export const useAdminToken = () => useAuthStore((state) => state.adminToken);
export const useAdminExpiresAt = () =>
	useAuthStore((state) => state.adminExpiresAt);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useIsRefreshing = () =>
	useAuthStore((state) => state.isRefreshing);
export const useAuthError = () => useAuthStore((state) => state.error);

// Individual action selectors - avoid object creation
export const useSetAuth = () => useAuthStore((state) => state.setAuth);
export const useSetAccessToken = () =>
	useAuthStore((state) => state.setAccessToken);
export const useSetAdminElevation = () =>
	useAuthStore((state) => state.setAdminElevation);
export const useClearAdminElevation = () =>
	useAuthStore((state) => state.clearAdminElevation);
export const useSetAdminExpiry = () =>
	useAuthStore((state) => state.setAdminExpiry);
export const useSetLoading = () => useAuthStore((state) => state.setLoading);
export const useSetRefreshing = () =>
	useAuthStore((state) => state.setRefreshing);
export const useSetError = () => useAuthStore((state) => state.setError);
export const useClearAuth = () => useAuthStore((state) => state.clearAuth);
export const useResetAuth = () => useAuthStore((state) => state.reset);
