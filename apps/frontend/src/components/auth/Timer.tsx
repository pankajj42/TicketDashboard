import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimerProps {
	initial?: number;
	onExpire?: () => void;
	className?: string;
	showIcon?: boolean;
}

export default function Timer({
	initial = 300,
	onExpire,
	className,
	showIcon = true,
}: TimerProps) {
	const [sec, setSec] = useState(initial);

	useEffect(() => {
		setSec(initial);
	}, [initial]);

	useEffect(() => {
		if (sec <= 0) {
			onExpire?.();
			return;
		}
		const t = setInterval(() => setSec((s) => s - 1), 1000);
		return () => clearInterval(t);
	}, [sec, onExpire]);

	const minutes = Math.floor(sec / 60);
	const seconds = sec % 60;
	const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
		.toString()
		.padStart(2, "0")}`;

	const isExpiring = sec <= 60; // Warning state when less than 1 minute

	return (
		<div
			className={cn(
				"flex items-center gap-2 text-sm transition-colors",
				isExpiring
					? "text-destructive dark:text-red-400"
					: "text-muted-foreground",
				className
			)}
		>
			{showIcon && (
				<Clock
					className={cn("h-4 w-4", isExpiring && "animate-pulse")}
				/>
			)}
			<span className="font-mono">Expires in {formattedTime}</span>
		</div>
	);
}
