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
				<Avatar className="h-12 w-12 cursor-pointer hover:ring-4 hover:ring-blue-500 hover:ring-offset-2 transition-all duration-200">
					<AvatarFallback>US</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent side="top">
				<DropdownMenuItem className="m-2 text-md">
					<ShieldUser />
					<span>Admin access</span>
				</DropdownMenuItem>
				<DropdownMenuItem className="m-2 text-md">
					<Settings />
					<span>Settings</span>
				</DropdownMenuItem>
				<DropdownMenuItem className="m-2 text-md">
					<LogOutIcon />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
