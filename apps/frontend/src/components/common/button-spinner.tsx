import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonSpinnerProps = {
	loading: boolean;
	children: React.ReactNode;
	loadingText?: string;
	icon?: React.ReactNode;
	className?: string;
	spinnerSizeClass?: string; // e.g., "h-4 w-4"
};

export function ButtonSpinner({
	loading,
	children,
	loadingText,
	icon,
	className,
	spinnerSizeClass = "h-4 w-4",
}: ButtonSpinnerProps) {
	return (
		<span className={cn("inline-flex items-center", className)}>
			{loading ? (
				<>
					<svg
						className={cn("mr-2 animate-spin", spinnerSizeClass)}
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
						></path>
					</svg>
					<span>{loadingText ?? children}</span>
				</>
			) : (
				<>
					{icon ? <span className="mr-2">{icon}</span> : null}
					<span>{children}</span>
				</>
			)}
		</span>
	);
}
