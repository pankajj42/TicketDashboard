import { Bell, FolderDot, FolderOpenDot, Loader2 } from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import {
	useAccessToken,
	useIsAdminElevated,
	useUser,
} from "@/store/auth.store";
import { useProjectStore } from "@/store/project.store";
import LogoIcon from "./logo";
import CreateProjectButton from "./admin/create-project";
import { TextSkeleton } from "./loading-skeletons";

export function AppSidebar() {
	const {
		projects,
		selectedProjectId,
		setSelected,
		loadProjects,
		toggleSubscribe,
		loadingProjects,
		subscriptionLoading,
	} = useProjectStore();
	const user = useUser();
	const token = useAccessToken();
	const isAdmin = useIsAdminElevated();

	useEffect(() => {
		if (!token) return;
		loadProjects();
	}, [token, loadProjects]);

	const onProjectSelect = (id: string) => {
		setSelected(id);
	};

	return (
		<Sidebar>
			<SidebarHeader className="bg-gray-50 dark:bg-gray-950">
				<div className="flex items-center gap-3 mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					<LogoIcon />
					<div className="flex-1 min-w-0">
						<div className="font-bold text-gray-800 dark:text-gray-100 text-lg">
							TicketDash
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-300 truncate">
							{user?.username || user?.email || "Loading..."}
						</div>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent className="custom-scrollbar bg-gray-50 dark:bg-gray-950">
				<SidebarHeader>
					<div className="px-3 text-lg font-semibold text-gray-500 dark:text-gray-400">
						Projects
					</div>
				</SidebarHeader>
				<SidebarGroup>
					<SidebarGroupContent className="custom-scrollbar">
						{isAdmin && (
							<div className="px-3 pb-2">
								<CreateProjectButton />
							</div>
						)}
						<SidebarMenu>
							{loadingProjects && (
								<div className="px-3 py-2 space-y-2">
									<TextSkeleton lines={1} />
									<TextSkeleton lines={1} />
									<TextSkeleton lines={1} />
								</div>
							)}
							{!loadingProjects && projects.length === 0 && (
								<div className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
									No projects yet
								</div>
							)}
							{projects.map((p) => (
								<SidebarMenuItem key={p.id}>
									<SidebarMenuButton
										asChild
										isActive={selectedProjectId === p.id}
									>
										<a
											href="#"
											onClick={() =>
												onProjectSelect(p.id)
											}
										>
											{selectedProjectId === p.id ? (
												<FolderOpenDot className="mr-2" />
											) : (
												<FolderDot className="mr-2 opacity-50" />
											)}
											<span>{p.name}</span>
											<span className="ml-auto">
												<button
													title={
														p.isSubscribed
															? "Unsubscribe"
															: "Subscribe"
													}
													className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
													onClick={(e) => {
														e.preventDefault();
														toggleSubscribe(p.id);
													}}
													disabled={
														!!subscriptionLoading[
															p.id
														]
													}
												>
													{subscriptionLoading[
														p.id
													] ? (
														<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
													) : (
														<Bell
															className={
																p.isSubscribed
																	? "text-yellow-500"
																	: "text-gray-400"
															}
														/>
													)}
												</button>
											</span>
										</a>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
