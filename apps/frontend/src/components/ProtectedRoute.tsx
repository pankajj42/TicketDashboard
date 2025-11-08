import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
	children: React.ReactNode;
	redirectTo?: string;
}

// Auth loading skeleton component
function AuthLoadingSkeleton({ message }: { message: string }) {
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
					{message}
				</p>
			</div>
		</div>
	);
}

export default function ProtectedRoute({
	children,
	redirectTo = "/login",
}: ProtectedRouteProps) {
	const location = useLocation();
	const { isAuthenticated, checkAuth, isRefreshing } = useAuth();
	const [isValidating, setIsValidating] = useState(true);
	const [isValid, setIsValid] = useState(false);

	useEffect(() => {
		const validateAuth = async () => {
			if (!isAuthenticated) {
				setIsValidating(false);
				setIsValid(false);
				return;
			}

			try {
				const valid = await checkAuth();
				setIsValid(valid);
			} catch (error) {
				console.error("Auth validation error:", error);
				setIsValid(false);
			} finally {
				setIsValidating(false);
			}
		};

		validateAuth();
	}, [isAuthenticated, checkAuth]);

	// Show loading spinner while validating or refreshing token
	if (isValidating || isRefreshing) {
		return (
			<AuthLoadingSkeleton
				message={
					isRefreshing
						? "Refreshing session..."
						: "Validating authentication..."
				}
			/>
		);
	}

	// Redirect to login if not authenticated or validation failed
	if (!isAuthenticated || !isValid) {
		return <Navigate to={redirectTo} state={{ from: location }} replace />;
	}

	// Render protected content
	return <>{children}</>;
}

// Public route wrapper - redirects to dashboard if already authenticated
interface PublicRouteProps {
	children: React.ReactNode;
	redirectTo?: string;
}

export function PublicRoute({
	children,
	redirectTo = "/dashboard",
}: PublicRouteProps) {
	const { isAuthenticated } = useAuth();

	if (isAuthenticated) {
		return <Navigate to={redirectTo} replace />;
	}

	return <>{children}</>;
}
