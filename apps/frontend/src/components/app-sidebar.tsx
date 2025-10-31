import {
	ChevronUp,
	FolderDot,
	FolderOpenDot,
	LogOutIcon,
	Settings,
} from "lucide-react";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";

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
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
		url: "#",
	},
	{
		title: "Project 2",
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
			<SidebarHeader>
				<div className="flex items-center gap-3 mb-3 p-3 bg-white rounded-lg shadow-sm">
					<div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
						<span className="text-white font-bold text-xl">TD</span>
					</div>
					<div className="flex-1 min-w-0">
						<div className="font-bold text-gray-800 text-lg">
							TicketDash
						</div>
						<div className="text-sm text-gray-600 truncate">
							Username
						</div>
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Projects</SidebarGroupLabel>
					<SidebarGroupContent>
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
			<SidebarFooter>
				<div className="flex items-center gap-3 mt-3 p-3 bg-white rounded-lg shadow-sm">
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton>
										<Avatar>
											<AvatarFallback>US</AvatarFallback>
										</Avatar>{" "}
										Username
										<ChevronUp className="ml-auto" />
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="top"
									className="w-[--radix-popper-anchor-width] "
								>
									<DropdownMenuItem>
										<Settings />
										<span>Settings</span>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<LogOutIcon />
										<span>Sign out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					</SidebarMenu>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
