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
import React from "react";
import { AsyncMenuItem } from "@/components/common/async-menu-item";
import AdminAccessDialog from "./admin/admin-access-dialog";
import { useIsAdminElevated } from "@/store/auth.store";

export default function UserActions() {
	const { user, logout } = useAuth();
	const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
	const [isAdminDialogOpen, setIsAdminDialogOpen] = React.useState(false);
	const [isAdminRevokeDialogOpen, setIsAdminRevokeDialogOpen] =
		React.useState(false);
	const isAdmin = useIsAdminElevated();
	// Logout handled via AsyncMenuItem spinner state

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

	// Show skeleton only when user data is not yet available
	// Don't gate on global isLoading, so dialogs don't unmount during actions
	if (!user) {
		return <AvatarSkeleton />;
	}

	return (
		<>
			<AdminAccessDialog
				open={isAdminDialogOpen}
				onOpenChange={setIsAdminDialogOpen}
				mode="elevate"
			/>
			<AdminAccessDialog
				open={isAdminRevokeDialogOpen}
				onOpenChange={setIsAdminRevokeDialogOpen}
				mode="revoke"
			/>
			<SettingsDialog
				open={isSettingsOpen}
				onOpenChange={setIsSettingsOpen}
			/>
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
						onSelect={() => {
							if (isAdmin) {
								setIsAdminRevokeDialogOpen(true);
							} else {
								setIsAdminDialogOpen(true);
							}
						}}
					>
						<ShieldUser />
						<span>
							{isAdmin ? "Revoke admin access" : "Admin access"}
						</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
						onSelect={() => setIsSettingsOpen(true)}
					>
						<Settings />
						<span>Settings</span>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<AsyncMenuItem
						onSelect={async () => {
							try {
								await logout();
							} catch (error) {
								console.error(
									"[auth] logout from avatar failed",
									error
								);
								toast.error(
									"Failed to logout. Please try again."
								);
							}
						}}
						className="m-2 text-md text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
						loadingText="Signing out..."
						icon={<LogOutIcon />}
					>
						Sign out
					</AsyncMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
