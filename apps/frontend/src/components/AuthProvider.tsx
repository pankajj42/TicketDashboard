import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthProviderProps {
	children: React.ReactNode;
}

// Auth initialization skeleton
function AuthInitializingSkeleton() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="flex flex-col items-center space-y-6 max-w-sm w-full p-6">
				<div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
					<Shield className="h-8 w-8 text-primary animate-pulse" />
				</div>
				<div className="space-y-3 w-full">
					<Skeleton className="h-4 w-3/4 mx-auto" />
					<Skeleton className="h-3 w-1/2 mx-auto" />
				</div>
				<p className="text-sm text-muted-foreground text-center animate-pulse">
					Initializing authentication...
				</p>
			</div>
		</div>
	);
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
		return <AuthInitializingSkeleton />;
	}

	return <>{children}</>;
}
