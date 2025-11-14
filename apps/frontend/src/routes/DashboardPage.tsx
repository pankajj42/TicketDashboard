import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "../components/app-sidebar";
import AppHeader from "../components/app-header";
import KanbanBoard from "../components/kanban/kanban-board";
import { type Column } from "../components/kanban/kanban-utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useProjectStore } from "@/store/project.store";
import { useAccessToken } from "@/store/auth.store";
import { TicketApiService } from "@/services/ticket.api";
import type { TicketStatus } from "@repo/shared";
import TicketDialog from "@/components/ticket/ticket-dialog";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/loading-skeletons";

const DashboardPage = () => {
	const { selectedProjectId } = useProjectStore();
	const token = useAccessToken();
	const [columns, setColumns] = useState<Column[]>([]);
	const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
	const [openTicketId, setOpenTicketId] = useState<string | null>(null);
	const [pendingMoveIds, setPendingMoveIds] = useState<Set<string>>(
		new Set()
	);

	const disabledIds = useMemo(
		() => Array.from(pendingMoveIds),
		[pendingMoveIds]
	);

	const fetchTickets = useCallback(async () => {
		if (!selectedProjectId || !token) return;
		setLoadingTickets(true);
		try {
			const { tickets } = await TicketApiService.list(
				selectedProjectId,
				token
			);
			const map: Record<string, Column> = {
				PROPOSED: { id: "PROPOSED", title: "Proposed", items: [] },
				TODO: { id: "TODO", title: "To Do", items: [] },
				INPROGRESS: {
					id: "INPROGRESS",
					title: "In Progress",
					items: [],
				},
				DONE: { id: "DONE", title: "Done", items: [] },
				DEPLOYED: { id: "DEPLOYED", title: "Deployed", items: [] },
			};
			for (const t of tickets) {
				map[t.status]?.items.push({
					id: t.id,
					title: t.title,
					description: t.description,
				});
			}
			setColumns(Object.values(map));
		} catch (e: any) {
			toast.error(e?.message || "Failed to load tickets");
		} finally {
			setLoadingTickets(false);
		}
	}, [selectedProjectId, token]);

	useEffect(() => {
		fetchTickets();
	}, [fetchTickets]);

	useEffect(() => {
		const handler = () => fetchTickets();
		window.addEventListener("tickets:refresh", handler);
		return () => window.removeEventListener("tickets:refresh", handler);
	}, [fetchTickets]);

	return (
		<SidebarProvider>
			<AppSidebar />
			<main className="h-screen w-full flex flex-col">
				<AppHeader />
				{loadingTickets ? (
					<div className="flex-1 p-4">
						<div className="md:grid md:grid-cols-5 md:gap-4 flex flex-col gap-4">
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={i}
									className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4"
								>
									<CardSkeleton />
									<div className="mt-4 space-y-3">
										<CardSkeleton />
										<CardSkeleton />
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<KanbanBoard
						columns={columns}
						setColumns={setColumns}
						disabledCardIds={disabledIds}
						onMove={async (cardId, fromColumnId, toColumnId) => {
							// Quiet no-op: same column reorder should not call API or toast
							if (fromColumnId === toColumnId) return;
							try {
								if (!token) return;
								setPendingMoveIds((prev) =>
									new Set(prev).add(cardId)
								);
								await TicketApiService.changeStatus(
									cardId,
									{ status: toColumnId as TicketStatus },
									token
								);
								toast.success(
									`Status changed: ${fromColumnId} → ${toColumnId}`
								);
								if (
									fromColumnId === "PROPOSED" &&
									toColumnId !== "PROPOSED"
								) {
									toast.success("Ticket assigned to you");
								} else if (
									toColumnId === "PROPOSED" &&
									fromColumnId !== "PROPOSED"
								) {
									toast.success("Ticket unassigned");
								}
							} catch (e) {
								const msg =
									e?.message || "Failed to change status";
								toast.error(msg);
								// refetch to restore correct state
								fetchTickets();
							} finally {
								setPendingMoveIds((prev) => {
									const next = new Set(prev);
									next.delete(cardId);
									return next;
								});
							}
						}}
						onOpenTicket={(id) => setOpenTicketId(id)}
					/>
				)}
				<TicketDialog
					ticketId={openTicketId}
					onClose={() => setOpenTicketId(null)}
				/>
			</main>
		</SidebarProvider>
	);
};

export default DashboardPage;
