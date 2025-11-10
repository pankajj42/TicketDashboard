import { LogOutIcon, Settings, ShieldUser } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { AvatarSkeleton } from "./loading-skeletons";
import { toast } from "sonner";
import SettingsDialog from "./settings/settings-dialog";

export default function UserActions() {
	const { user, logout, isLoading } = useAuth();

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error("Logout error:", error);
			toast.error("Failed to logout. Please try again.");
		}
	};

	// Get user initials for avatar
	const getUserInitials = () => {
		if (!user?.email) return "U";
		const email = user.email;
		const parts = email.split("@")[0].split(".");
		if (parts.length >= 2) {
			return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
		}
		return email.charAt(0).toUpperCase();
	};

	// Show skeleton while loading user data
	if (isLoading || !user) {
		return <AvatarSkeleton />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="h-12 w-12 cursor-pointer hover:ring-4 hover:ring-gray-300 dark:hover:ring-gray-400 hover:ring-offset-2 hover:ring-offset-gray-50 dark:hover:ring-offset-gray-800 transition-all duration-200">
					<AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold">
						{getUserInitials()}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 w-56"
			>
				{/* User Info */}
				<div className="px-3 py-2 text-sm">
					<p className="font-medium text-gray-900 dark:text-gray-100">
						{user?.username || "User"}
					</p>
					<p className="text-gray-500 dark:text-gray-400 truncate">
						{user?.email}
					</p>
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
					disabled={isLoading}
				>
					<ShieldUser />
					<span>Admin access</span>
				</DropdownMenuItem>
				<SettingsDialog>
					<DropdownMenuItem
						className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
						disabled={isLoading}
						onSelect={(e: Event) => e.preventDefault()} // Prevent dropdown from closing
					>
						<Settings />
						<span>Settings</span>
					</DropdownMenuItem>
				</SettingsDialog>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={handleLogout}
					disabled={isLoading}
					className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
				>
					<LogOutIcon />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
