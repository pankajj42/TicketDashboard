import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLoadingSkeleton } from "@/components/loading-skeletons";

interface ProtectedRouteProps {
	children: React.ReactNode;
	redirectTo?: string;
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
