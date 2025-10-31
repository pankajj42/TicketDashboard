import "./App.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import KanbanBoard from "./components/kanban/kanban-board";

function App() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<main>
				<SidebarTrigger />
				<KanbanBoard />
			</main>
		</SidebarProvider>
	);
}

export default App;
