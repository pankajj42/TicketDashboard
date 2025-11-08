import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import AuthProvider from "@/components/AuthProvider";
import ProtectedRoute, { PublicRoute } from "@/components/ProtectedRoute";
import DashboardPage from "./routes/DashboardPage";
import LoginPage from "./routes/LoginPage";
import { Toaster } from "sonner";

function App() {
	return (
		<ErrorBoundary>
			<ThemeProvider
				defaultTheme="system"
				storageKey="ticketdash-ui-theme"
			>
				<AuthProvider>
					<Toaster position="top-right" richColors closeButton />
					<Routes>
						{/* Public routes - redirect to dashboard if authenticated */}
						<Route
							path="/login"
							element={
								<PublicRoute>
									<LoginPage />
								</PublicRoute>
							}
						/>

						{/* Protected routes - require authentication */}
						<Route
							path="/dashboard"
							element={
								<ProtectedRoute>
									<DashboardPage />
								</ProtectedRoute>
							}
						/>

						{/* Default redirect */}
						<Route
							path="/"
							element={<Navigate to="/dashboard" replace />}
						/>
						<Route
							path="*"
							element={<Navigate to="/login" replace />}
						/>
					</Routes>
				</AuthProvider>
			</ThemeProvider>
		</ErrorBoundary>
	);
}

export default App;
