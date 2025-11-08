import React, { Component } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// Call optional error handler
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: undefined });
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="min-h-screen flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle className="text-destructive">
								Something went wrong
							</CardTitle>
							<CardDescription>
								An unexpected error occurred. This might be due
								to a temporary issue.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{this.state.error && (
								<details className="text-sm">
									<summary className="cursor-pointer text-muted-foreground">
										Error details
									</summary>
									<pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
										{this.state.error.message}
									</pre>
								</details>
							)}
							<div className="flex gap-2">
								<Button
									onClick={this.handleRetry}
									variant="outline"
									size="sm"
								>
									Try again
								</Button>
								<Button
									onClick={() => window.location.reload()}
									variant="default"
									size="sm"
								>
									Reload page
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

// Hook version for functional components
export const useErrorHandler = () => {
	return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
		console.error("Error caught by handler:", error, errorInfo);

		// You could send to error tracking service here
		// Example: Sentry.captureException(error, { extra: errorInfo });
	}, []);
};
