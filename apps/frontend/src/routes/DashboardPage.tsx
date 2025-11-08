import { useState } from "react";
import { AppSidebar } from "../components/app-sidebar";
import AppHeader from "../components/app-header";
import KanbanBoard from "../components/kanban/kanban-board";
import {
	DEFAULT_BOARD,
	type Column,
	uid,
} from "../components/kanban/kanban-utils";
import { SidebarProvider } from "@/components/ui/sidebar";

const DashboardPage = () => {
	const [columns, setColumns] = useState<Column[]>(DEFAULT_BOARD);

	function handleAddCard(title: string, columnId: string) {
		setColumns((prev) =>
			prev.map((c) =>
				c.id === columnId
					? {
							...c,
							items: [{ id: uid("c"), title }, ...c.items],
						}
					: c
			)
		);
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<main className="h-screen w-full flex flex-col">
				<AppHeader columns={columns} onAddCard={handleAddCard} />
				<KanbanBoard columns={columns} setColumns={setColumns} />
			</main>
		</SidebarProvider>
	);
};

export default DashboardPage;
