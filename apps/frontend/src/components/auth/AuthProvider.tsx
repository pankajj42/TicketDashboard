import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/loading-skeletons";

interface AuthProviderProps {
	children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const { refreshToken, isRefreshing, isAuthenticated } = useAuth();
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		const initializeAuth = async () => {
			try {
				// Only try to refresh token if user is not already authenticated
				// This prevents unnecessary refresh calls after successful login
				if (!isAuthenticated) {
					console.log(
						"Attempting to restore session from refresh token..."
					);
					await refreshToken();
				} else {
					console.log(
						"User already authenticated, skipping token refresh"
					);
				}
			} catch (error) {
				// If refresh fails, user is not authenticated (which is fine)
				console.log("No valid session found on startup");
			} finally {
				setIsInitialized(true);
			}
		};

		// Only run initialization once on mount
		if (!isInitialized) {
			initializeAuth();
		}
	}, [refreshToken, isAuthenticated, isInitialized]);

	// Show loading screen while checking authentication
	if (!isInitialized || isRefreshing) {
		return (
			<AuthLoadingSkeleton
				message={
					isRefreshing
						? "Refreshing session..."
						: "Initializing authentication..."
				}
			/>
		);
	}

	return <>{children}</>;
}
