import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/store/auth.store";
import { useAuth } from "@/hooks/useAuth";
import { ProfileTab } from "./profile-tab";
import { SecurityTab } from "./security-tab";
import { SettingsSidebar } from "./settings-sidebar";

type SettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type Tab = "profile" | "security";

export default function SettingsDialog({
	open,
	onOpenChange,
}: SettingsDialogProps) {
	const [activeTab, setActiveTab] = useState<Tab>("profile");
	const [editingUsername, setEditingUsername] = useState(false);
	const [savingUsername, setSavingUsername] = useState(false);
	const [securityBusy, setSecurityBusy] = useState(false);
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
			setSavingUsername(true);
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
		} finally {
			setSavingUsername(false);
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
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						disabled={
							savingUsername || editingUsername || securityBusy
						}
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
									savingUsername={savingUsername}
								/>
							)}

							{activeTab === "security" && (
								<SecurityTab
									getUserDevices={getUserDevices}
									logoutFromDevice={logoutFromDevice}
									logoutFromAllDevices={logoutFromAllDevices}
									onBusyChange={setSecurityBusy}
								/>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
