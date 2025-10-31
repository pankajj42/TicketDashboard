import "./App.css";
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import AppHeader from "./components/app-header";
import KanbanBoard from "./components/kanban/kanban-board";
import { ThemeProvider } from "./components/theme-provider";
import {
	DEFAULT_BOARD,
	type Column,
	uid,
} from "./components/kanban/kanban-utils";

function App() {
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
		<ThemeProvider defaultTheme="light" storageKey="ticket-dashboard-theme">
			<SidebarProvider>
				<AppSidebar />
				<main className="h-screen w-full flex flex-col">
					<AppHeader columns={columns} onAddCard={handleAddCard} />
					<KanbanBoard columns={columns} setColumns={setColumns} />
				</main>
			</SidebarProvider>
		</ThemeProvider>
	);
}

export default App;
