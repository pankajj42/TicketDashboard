import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/loading-skeletons";

interface AuthProviderProps {
	children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
	const { refreshToken, isRefreshing } = useAuth();
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		const initializeAuth = async () => {
			try {
				// Try to refresh token on app startup
				// This will check if there's a valid refresh token cookie
				await refreshToken();
			} catch (error) {
				// If refresh fails, user is not authenticated (which is fine)
				console.log("No valid session found on startup");
			} finally {
				setIsInitialized(true);
			}
		};

		initializeAuth();
	}, [refreshToken]);

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
