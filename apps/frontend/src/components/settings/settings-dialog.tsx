import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { useUser } from "@/store/auth.store";
import { useAuth } from "@/hooks/useAuth";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";
import { SettingsSidebar } from "./settings-sidebar";

type SettingsDialogProps = {
	children?: React.ReactNode;
};

type Tab = "profile" | "security";

export default function SettingsDialog({ children }: SettingsDialogProps) {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<Tab>("profile");
	const [editingUsername, setEditingUsername] = useState(false);
	const [newUsername, setNewUsername] = useState("");

	const user = useUser();
	const {
		updateProfile,
		getUserDevices,
		logoutFromDevice,
		logoutFromAllDevices,
		error: authError,
		clearError,
	} = useAuth();

	const handleUsernameEdit = () => {
		setNewUsername(user?.username || "");
		setEditingUsername(true);
		// Clear any previous errors when starting to edit
		clearError();
	};

	const handleUsernameSave = async () => {
		if (!newUsername.trim()) return;

		try {
			const success = await updateProfile({
				username: newUsername.trim(),
			});

			if (success) {
				setEditingUsername(false);
			}
			// If update failed, keep editing mode open so user can try again
		} catch (error) {
			// Error handling is done by the auth hook via toast messages
			console.error("Username update failed:", error);
			// Keep editing mode open so user can correct and try again
		}
	};

	const handleUsernameCancel = () => {
		setNewUsername("");
		setEditingUsername(false);
		// Clear any errors when canceling edit
		clearError();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleUsernameSave();
		} else if (e.key === "Escape") {
			handleUsernameCancel();
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{children || (
					<Button
						variant="ghost"
						size="sm"
						className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
					>
						<Settings className="h-4 w-4" />
					</Button>
				)}
			</DialogTrigger>

			<DialogContent className="sm:max-w-[800px] h-[600px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 p-0 flex flex-col">
				<DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-600 shrink-0">
					<DialogTitle className="text-gray-900 dark:text-gray-200">
						Settings
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-1 min-h-0 overflow-hidden">
					<SettingsSidebar
						activeTab={activeTab}
						onTabChange={setActiveTab}
					/>

					{/* Content */}
					<div className="flex-1 min-h-0 overflow-hidden flex flex-col">
						<div className="flex-1 px-4 pt-4 pb-4 overflow-y-auto">
							{activeTab === "profile" && (
								<ProfileTab
									user={user}
									editingUsername={editingUsername}
									newUsername={newUsername}
									setNewUsername={setNewUsername}
									onUsernameEdit={handleUsernameEdit}
									onUsernameSave={handleUsernameSave}
									onUsernameCancel={handleUsernameCancel}
									onKeyDown={handleKeyDown}
									error={authError}
									onClearError={clearError}
								/>
							)}

							{activeTab === "security" && (
								<SecurityTab
									getUserDevices={getUserDevices}
									logoutFromDevice={logoutFromDevice}
									logoutFromAllDevices={logoutFromAllDevices}
								/>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
