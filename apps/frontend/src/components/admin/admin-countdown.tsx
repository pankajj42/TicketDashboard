import React from "react";
import { useIsAdminElevated, useAdminExpiresAt } from "@/store/auth.store";
import AdminAccessDialog from "./admin-access-dialog";

function formatRemaining(ms: number) {
	if (ms <= 0) return "00:00";
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60)
		.toString()
		.padStart(2, "0");
	const seconds = (totalSeconds % 60).toString().padStart(2, "0");
	return `${minutes}:${seconds}`;
}

export default function AdminCountdown() {
	const isAdmin = useIsAdminElevated();
	const expiresAt = useAdminExpiresAt();

	const [remainingLabel, setRemainingLabel] = React.useState<string>("00:00");
	const [msLeft, setMsLeft] = React.useState<number>(0);
	// Dialog state MUST be declared before any conditional returns to avoid hook order mismatches
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		if (!isAdmin || !expiresAt) return;
		const expiry = new Date(expiresAt).getTime();

		const tick = () => {
			const now = Date.now();
			const diff = expiry - now;
			setMsLeft(diff);
			if (diff <= 0) {
				setRemainingLabel("00:00");
				return false;
			}
			setRemainingLabel(formatRemaining(diff));
			return true;
		};

		// Initial tick and start interval
		if (!tick()) return;
		const id = setInterval(() => {
			const keep = tick();
			if (!keep) clearInterval(id);
		}, 1000);
		return () => clearInterval(id);
	}, [isAdmin, expiresAt]);

	if (!isAdmin || !expiresAt) return null;

	const urgent = msLeft <= 60_000; // < 1 minute
	const classes = urgent
		? "bg-red-100 text-red-900 dark:bg-red-200/20 dark:text-red-200 border-red-300/70 dark:border-red-200/30"
		: "bg-amber-100 text-amber-900 dark:bg-amber-200/20 dark:text-amber-200 border-amber-300/70 dark:border-amber-200/30";

	const onClick = () => setOpen(true);

	return (
		<>
			<AdminAccessDialog
				open={open}
				onOpenChange={setOpen}
				mode="revoke"
			/>
			<button
				onClick={onClick}
				className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border ${classes} cursor-pointer select-none`}
				title="Admin mode active — click to revoke"
			>
				<span
					className={`inline-flex h-2 w-2 rounded-full ${urgent ? "bg-red-500" : "bg-amber-500"} animate-pulse`}
				/>
				<span className="text-sm font-medium">Admin</span>
				<span className="text-sm tabular-nums">{remainingLabel}</span>
			</button>
		</>
	);
}
