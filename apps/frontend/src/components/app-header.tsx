import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { type Column } from "./kanban/kanban-utils";
import CreateTicket from "./create-ticket";
import UserActions from "./user-actions";
import { ThemeToggle } from "./theme-toggle";
import { title } from "@repo/shared";

type AppHeaderProps = {
	columns: Column[];
	onAddCard: (title: string, columnId: string) => void;
};

export default function AppHeader({ columns, onAddCard }: AppHeaderProps) {
	const { toggleSidebar } = useSidebar();

	return (
		<div className="shrink-0 p-4 border-b bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						onClick={toggleSidebar}
						className="h-12 w-12 p-0 hover:bg-gray-200 dark:hover:bg-gray-800 hover:scale-105 transition-all duration-200 rounded-xl border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-sm"
					>
						<Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
						<span className="sr-only">Toggle Sidebar</span>
					</Button>
					<h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
						{title}
					</h1>
				</div>

				<div className="flex items-center gap-3 pr-4">
					<CreateTicket columns={columns} onAddCard={onAddCard} />
					<ThemeToggle />
					<UserActions />
				</div>
			</div>
		</div>
	);
}
