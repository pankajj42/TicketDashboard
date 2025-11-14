import { User, Shield } from "lucide-react";

type Tab = "profile" | "security";

type SettingsSidebarProps = {
	activeTab: Tab;
	onTabChange: (tab: Tab) => void;
	disabled?: boolean;
};

export function SettingsSidebar({
	activeTab,
	onTabChange,
	disabled = false,
}: SettingsSidebarProps) {
	return (
		<div className="w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-600">
			<div className="p-3 space-y-2">
				<button
					onClick={() => onTabChange("profile")}
					disabled={disabled}
					className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
						activeTab === "profile"
							? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
							: `text-gray-600 dark:text-gray-400 ${
									disabled
										? "opacity-50 cursor-not-allowed"
										: "hover:bg-gray-100 dark:hover:bg-gray-800"
								}`
					}`}
				>
					<User className="h-4 w-4" />
					Profile
				</button>
				<button
					onClick={() => onTabChange("security")}
					disabled={disabled}
					className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
						activeTab === "security"
							? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
							: `text-gray-600 dark:text-gray-400 ${
									disabled
										? "opacity-50 cursor-not-allowed"
										: "hover:bg-gray-100 dark:hover:bg-gray-800"
								}`
					}`}
				>
					<Shield className="h-4 w-4" />
					Security
				</button>
			</div>
		</div>
	);
}
