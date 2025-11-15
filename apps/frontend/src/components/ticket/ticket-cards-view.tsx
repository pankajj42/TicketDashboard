import { useEffect, useState, useCallback } from "react";
import { useAccessToken } from "@/store/auth.store";
import { useUser } from "@/store/auth.store";
import { TicketApiService } from "@/services/ticket.api";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/loading-skeletons";
import { Layers } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { connectRealtime } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";

export default function TicketCardsView({
	mode,
	onOpen,
}: {
	mode: "CREATED" | "ASSIGNED";
	onOpen: (id: string) => void;
}) {
	const token = useAccessToken();
	const user = useUser();
	const [tickets, setTickets] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	// Track initial load per mode so switching shows skeleton again
	// Removed initialLoad usage; skeleton displays whenever loading
	// (keeping state removed to avoid unused variable warning)

	// Reset tickets when mode changes to avoid showing stale items
	useEffect(() => {
		setTickets([]);
	}, [mode]);

	const refresh = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const res =
				mode === "CREATED"
					? await TicketApiService.listCreated(token)
					: await TicketApiService.listAssigned(token);
			setTickets(res.tickets);
		} catch (e: any) {
			toast.error(e?.message || "Failed to load tickets");
		} finally {
			setLoading(false);
		}
	}, [token, mode]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// Realtime refresh
	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock) return;
		const shouldRefreshAssigned = (p: any) => {
			if (!user?.id) return false;
			// Refresh when assignment changes and involves current user
			if (p?.assignedToId === user.id) return true;
			// Unassignment might remove from list
			if (p?.assignedToId == null) return true;
			return false;
		};
		const onCreated = (p: any) => {
			if (mode === "CREATED" && p?.actorId && p.actorId === user?.id) {
				refresh();
			}
		};
		const onUpdated = () => {
			// Ticket content/status may have changed; safe to refresh current list
			refresh();
		};
		const onStatus = () => {
			if (mode === "ASSIGNED") refresh();
		};
		const onAssignment = (p: any) => {
			if (mode === "ASSIGNED" && shouldRefreshAssigned(p)) refresh();
		};

		sock.on("ticket:created", onCreated);
		sock.on("ticket:updated", onUpdated);
		sock.on("ticket:status", onStatus);
		sock.on("ticket:assignment", onAssignment);
		return () => {
			sock.off("ticket:created", onCreated);
			sock.off("ticket:updated", onUpdated);
			sock.off("ticket:status", onStatus);
			sock.off("ticket:assignment", onAssignment);
		};
	}, [mode, user?.id, refresh]);

	// Show skeleton whenever loading (initial or mode switch)
	if (loading) {
		return (
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3"
					>
						<CardSkeleton />
						<div className="mt-3 space-y-2">
							<CardSkeleton />
							<CardSkeleton />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (!loading && tickets.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-2xl border-gray-300 dark:border-gray-700">
				<Layers className="h-10 w-10 text-gray-400 mb-3" />
				<p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
					{mode === "CREATED"
						? "You haven't created any tickets yet. Start by drafting a clear, actionable request for the project."
						: "No tickets are currently assigned to you. Pick something from the board or create a new one."}
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{tickets.map((t) => (
				<button
					key={t.id}
					className="group relative text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-3 hover:shadow cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
					onClick={() => onOpen(t.id)}
				>
					<div className="text-xs text-gray-500 mb-1">
						{t.project?.name || "Project"}
					</div>
					<div className="font-medium text-gray-800 dark:text-gray-100">
						{t.title}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
						{t.description}
					</div>
					<div className="mt-2 text-xs inline-block rounded-full px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
						{t.status}
					</div>
					<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
						<Tooltip>
							<TooltipTrigger asChild>
								<span
									title="Open details"
									className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="h-4 w-4 text-gray-600 dark:text-gray-300"
									>
										<path d="M15 3h6v6" />
										<path d="M10 14 21 3" />
										<path d="M21 10v11H3V3h11" />
									</svg>
								</span>
							</TooltipTrigger>
							<TooltipContent sideOffset={6}>
								Open details
							</TooltipContent>
						</Tooltip>
					</div>
				</button>
			))}
		</div>
	);
}
