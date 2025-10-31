import { FolderDot, FolderOpenDot } from "lucide-react";

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
import { useState } from "react";

// Menu items.
const items = [
	{
		title: "Project 1",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 3",
		url: "#",
	},
];

export function AppSidebar() {
	const [selectedProject, setSelectedProject] = useState(0);

	const onProjectSelect = (index: number) => {
		setSelectedProject(index);
	};

	return (
		<Sidebar>
			<SidebarHeader className="bg-gray-50 dark:bg-gray-950">
				<div className="flex items-center gap-3 mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					<div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
						<span className="text-white font-bold text-xl">TD</span>
					</div>
					<div className="flex-1 min-w-0">
						<div className="font-bold text-gray-800 dark:text-gray-100 text-lg">
							TicketDash
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-300 truncate">
							Username
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
						<SidebarMenu>
							{items.map((item, index) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										asChild
										isActive={selectedProject === index}
									>
										<a
											href={item.url}
											onClick={() =>
												onProjectSelect(index)
											}
										>
											{selectedProject === index ? (
												<FolderOpenDot className="mr-2" />
											) : (
												<FolderDot className="mr-2 opacity-50" />
											)}
											<span>{item.title}</span>
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
