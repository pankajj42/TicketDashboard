import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import CreateTicket from "./create-ticket";
import UserActions from "./user-actions";
import NotificationsBell from "./common/notifications-bell";
import { ThemeToggle } from "./theme/theme-toggle";
import { title } from "@repo/shared";
import { useProjectStore } from "@/store/project.store";
import { TextSkeleton } from "./loading-skeletons";
import AdminCountdown from "./admin/admin-countdown";

export default function AppHeader() {
	const { toggleSidebar } = useSidebar();
	const { projects, selectedProjectId, loadingProjects } = useProjectStore();
	const selectedProject = projects.find((p) => p.id === selectedProjectId);

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
					<div className="flex flex-col min-w-[200px]">
						{loadingProjects ? (
							<>
								<TextSkeleton lines={1} className="w-40" />
								<TextSkeleton lines={1} className="w-64 mt-1" />
							</>
						) : (
							<>
								<h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
									{selectedProject?.name || "None"}
								</h1>
								{selectedProject?.description ? (
									<div className="text-sm text-gray-600 dark:text-gray-400">
										{selectedProject.description}
									</div>
								) : null}
							</>
						)}
					</div>
				</div>

				<div className="flex items-center gap-3 pr-4">
					<AdminCountdown />
					<NotificationsBell />
					<CreateTicket />
					<ThemeToggle />
					<UserActions />
				</div>
			</div>
		</div>
	);
}
