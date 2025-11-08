import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Common loading states for different UI elements

export function AvatarSkeleton({ className }: { className?: string }) {
	return <Skeleton className={cn("h-12 w-12 rounded-full", className)} />;
}

export function ButtonSkeleton({ className }: { className?: string }) {
	return <Skeleton className={cn("h-10 w-20 rounded-md", className)} />;
}

export function InputSkeleton({ className }: { className?: string }) {
	return <Skeleton className={cn("h-10 w-full rounded-md", className)} />;
}

export function CardSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("space-y-3", className)}>
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-4/5" />
			<Skeleton className="h-4 w-3/5" />
		</div>
	);
}

export function TextSkeleton({
	lines = 1,
	className,
}: {
	lines?: number;
	className?: string;
}) {
	return (
		<div className={cn("space-y-2", className)}>
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
				/>
			))}
		</div>
	);
}

export function OtpInputSkeleton({ length = 6 }: { length?: number }) {
	return (
		<div className="flex gap-2">
			{Array.from({ length }).map((_, i) => (
				<Skeleton key={i} className="h-12 w-12 rounded-lg" />
			))}
		</div>
	);
}

export function DropdownMenuSkeleton({ items = 3 }: { items?: number }) {
	return (
		<div className="w-56 space-y-1 p-1">
			{Array.from({ length: items }).map((_, i) => (
				<div key={i} className="flex items-center gap-2 px-2 py-1.5">
					<Skeleton className="h-4 w-4 rounded-sm" />
					<Skeleton className="h-4 flex-1" />
				</div>
			))}
		</div>
	);
}
