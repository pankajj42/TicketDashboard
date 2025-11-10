import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileTabProps = {
	user: any;
	editingUsername: boolean;
	newUsername: string;
	setNewUsername: (value: string) => void;
	onUsernameEdit: () => void;
	onUsernameSave: () => void;
	onUsernameCancel: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
};

export function ProfileTab({
	user,
	editingUsername,
	newUsername,
	setNewUsername,
	onUsernameEdit,
	onUsernameSave,
	onUsernameCancel,
	onKeyDown,
}: ProfileTabProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-4">
					Profile Information
				</h3>

				<div className="space-y-4">
					{/* Email Field */}
					<div>
						<Label className="text-gray-700 dark:text-gray-300">
							Email
						</Label>
						<div className="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-200">
							{user?.email || "No email provided"}
						</div>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Email cannot be changed
						</p>
					</div>

					{/* Username Field */}
					<div>
						<Label className="text-gray-700 dark:text-gray-300">
							Username
						</Label>
						{editingUsername ? (
							<div className="mt-1 space-y-2">
								<Input
									value={newUsername}
									onChange={(e) =>
										setNewUsername(e.target.value)
									}
									onKeyDown={onKeyDown}
									placeholder="Enter new username"
									autoFocus
									className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600"
								/>
								<div className="flex gap-2">
									<Button
										onClick={onUsernameSave}
										size="sm"
										className="bg-blue-600 hover:bg-blue-700 text-white"
									>
										Save
									</Button>
									<Button
										onClick={onUsernameCancel}
										size="sm"
										variant="outline"
										className="border-gray-300 dark:border-gray-600"
									>
										Cancel
									</Button>
								</div>
							</div>
						) : (
							<div className="mt-1 flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
								<span className="text-gray-900 dark:text-gray-200">
									{user?.username || "No username set"}
								</span>
								<Button
									onClick={onUsernameEdit}
									size="sm"
									variant="outline"
									className="ml-2 text-xs border-gray-300 dark:border-gray-600"
								>
									Edit
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
