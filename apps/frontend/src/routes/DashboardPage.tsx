import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "../components/app-sidebar";
import AppHeader from "../components/app-header";
import KanbanBoard from "../components/kanban/kanban-board";
import { type Column } from "../components/kanban/kanban-utils";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useProjectStore } from "@/store/project.store";
import { useAccessToken } from "@/store/auth.store";
import { TicketApiService } from "@/services/ticket.api";
import { httpClient } from "@/services/http";
import type { TicketStatus } from "@repo/shared";
import TicketDialog from "@/components/ticket/ticket-dialog";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/loading-skeletons";
import TicketCardsView from "@/components/ticket/ticket-cards-view";
import { useProjectRealtime } from "@/hooks/useProjectRealtime";
import { useAssignmentToasts } from "@/hooks/useAssignmentToasts";
import { useStatusToasts } from "@/hooks/useStatusToasts";
import { useCreatedToasts } from "@/hooks/useCreatedToasts";
import { useUpdatedToasts } from "@/hooks/useUpdatedToasts";
import { useProjectsRealtime } from "@/hooks/useProjectsRealtime";

const DashboardPage = () => {
	const { selectedProjectId, viewMode } = useProjectStore();
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

	// Enforce fixed column order irrespective of updates
	const COLUMN_ORDER = useMemo(
		() => ["PROPOSED", "TODO", "INPROGRESS", "DONE", "DEPLOYED"],
		[]
	);
	const orderColumns = useCallback(
		(cols: Column[]): Column[] =>
			[...cols].sort(
				(a, b) =>
					COLUMN_ORDER.indexOf(a.id) - COLUMN_ORDER.indexOf(b.id)
			),
		[COLUMN_ORDER]
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
			setColumns(orderColumns(Object.values(map)));
		} catch (e: any) {
			toast.error(e?.message || "Failed to load tickets");
		} finally {
			setLoadingTickets(false);
		}
	}, [selectedProjectId, token]);

	useEffect(() => {
		fetchTickets();
	}, [fetchTickets]);

	// Helpers to perform incremental mutations
	const addOrUpdateTicket = async (ticketId: string) => {
		try {
			const data = await httpClient.get<{ ticket: any }>(
				`/tickets/${ticketId}`,
				{ Authorization: `Bearer ${token}` }
			);
			const t = data.ticket;
			if (!t || t.projectId !== selectedProjectId) return;
			setColumns((prev) => {
				// Build map for easier mutation
				const map: Record<string, Column> = {};
				for (const c of prev) map[c.id] = { ...c, items: [...c.items] };
				// Remove ticket if it exists
				for (const c of Object.values(map)) {
					c.items = c.items.filter((i) => i.id !== ticketId);
				}
				// Insert into its status column
				if (!map[t.status]) {
					map[t.status] = {
						id: t.status,
						title: t.status,
						items: [],
					};
				}
				map[t.status].items.push({
					id: t.id,
					title: t.title,
					description: t.description,
				});
				return orderColumns(Object.values(map));
			});
		} catch {
			/* Silently ignore single fetch errors */
		}
	};

	const moveTicketStatus = (ticketId: string, status: string) => {
		setColumns((prev) => {
			const map: Record<string, Column> = {};
			for (const c of prev) map[c.id] = { ...c, items: [...c.items] };
			let found: {
				id: string;
				title: string;
				description?: string;
			} | null = null;
			for (const c of Object.values(map)) {
				const idx = c.items.findIndex((i) => i.id === ticketId);
				if (idx >= 0) {
					found = c.items[idx];
					c.items.splice(idx, 1);
					break;
				}
			}
			if (!found) {
				return prev;
			}
			if (!map[status]) {
				map[status] = { id: status, title: status, items: [] };
			}
			map[status].items.push(found);
			return orderColumns(Object.values(map));
		});
	};

	// Realtime subscription via shared hook with reconnect guard
	useProjectRealtime(selectedProjectId, {
		onTicketCreated: (id) => addOrUpdateTicket(id),
		onTicketUpdated: (id) => addOrUpdateTicket(id),
		onTicketStatus: (id, status) => moveTicketStatus(id, status),
	});

	// Toasts for assignment updates (global listener, no projectId arg now)
	useAssignmentToasts();
	// Toasts for status updates from others
	useStatusToasts(selectedProjectId);
	// Toasts for ticket created by others
	useCreatedToasts(selectedProjectId);
	// Toasts for ticket updated by others
	useUpdatedToasts(selectedProjectId);
	// Realtime updates for project list (create/update)
	useProjectsRealtime();

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
				) : viewMode === "BOARD" ? (
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
							} catch (e: any) {
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
				) : (
					<div className="flex-1 p-4 overflow-y-auto">
						<TicketCardsView
							mode={viewMode}
							onOpen={(id) => setOpenTicketId(id)}
						/>
					</div>
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
