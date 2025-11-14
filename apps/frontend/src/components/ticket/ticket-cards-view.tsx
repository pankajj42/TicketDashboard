import { useEffect, useState } from "react";
import { useAccessToken } from "@/store/auth.store";
import { TicketApiService } from "@/services/ticket.api";
import { toast } from "sonner";

export default function TicketCardsView({
	mode,
	onOpen,
}: {
	mode: "CREATED" | "ASSIGNED";
	onOpen: (id: string) => void;
}) {
	const token = useAccessToken();
	const [tickets, setTickets] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!token) return;
		(async () => {
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
		})();
	}, [token, mode]);

	if (loading) {
		return <div className="text-sm text-gray-500">Loading...</div>;
	}

	if (tickets.length === 0) {
		return <div className="text-sm text-gray-500">No tickets found</div>;
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{tickets.map((t) => (
				<button
					key={t.id}
					className="text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-700 p-3 hover:shadow"
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
				</button>
			))}
		</div>
	);
}
