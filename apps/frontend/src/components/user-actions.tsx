import { LogOutIcon, Settings, ShieldUser } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";

export default function UserActions() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="h-12 w-12 cursor-pointer hover:ring-4 hover:ring-gray-300 dark:hover:ring-gray-400 hover:ring-offset-2 hover:ring-offset-gray-50 dark:hover:ring-offset-gray-800 transition-all duration-200">
					<AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold">
						US
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
			>
				<DropdownMenuItem className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
					<ShieldUser />
					<span>Admin access</span>
				</DropdownMenuItem>
				<DropdownMenuItem className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
					<Settings />
					<span>Settings</span>
				</DropdownMenuItem>
				<DropdownMenuItem className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
					<LogOutIcon />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
