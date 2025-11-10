import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, LogOut } from "lucide-react";

type SecurityTabProps = {
	getUserDevices: () => Promise<any[]>;
	logoutFromDevice: (sessionId: string) => Promise<boolean>;
	logoutFromAllDevices: () => Promise<number>;
};

export function SecurityTab({
	getUserDevices,
	logoutFromDevice,
	logoutFromAllDevices,
}: SecurityTabProps) {
	const [devices, setDevices] = useState<any[]>([]);
	const [loadingDevicesList, setLoadingDevicesList] = useState(false);
	const [signingOutAll, setSigningOutAll] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingIndividualDevices, setLoadingIndividualDevices] = useState<
		Set<string>
	>(new Set());

	const loadDevices = async () => {
		setLoadingDevicesList(true);
		try {
			const deviceList = await getUserDevices();
			setDevices(deviceList);
		} catch (error) {
			console.error("Failed to load devices:", error);
		} finally {
			setLoadingDevicesList(false);
		}
	};

	const handleLogoutDevice = async (sessionId: string) => {
		setLoadingIndividualDevices((prev) => new Set(prev).add(sessionId));
		try {
			await logoutFromDevice(sessionId);
			await loadDevices(); // Refresh the list
		} catch (error) {
			console.error("Failed to logout device:", error);
		} finally {
			setLoadingIndividualDevices((prev) => {
				const newSet = new Set(prev);
				newSet.delete(sessionId);
				return newSet;
			});
		}
	};

	const handleLogoutAllDevices = async () => {
		setSigningOutAll(true);
		try {
			await logoutFromAllDevices();
			await loadDevices(); // Refresh the list
		} catch (error) {
			console.error("Failed to logout from all devices:", error);
		} finally {
			setSigningOutAll(false);
		}
	};

	const handleRefreshDevices = async () => {
		setRefreshing(true);
		try {
			const deviceList = await getUserDevices();
			setDevices(deviceList);
		} catch (error) {
			console.error("Failed to refresh devices:", error);
		} finally {
			setRefreshing(false);
		}
	};

	// Load devices when component mounts
	React.useEffect(() => {
		loadDevices();
	}, []);

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-4">
					Security & Sessions
				</h3>

				{/* Sign Out All Devices Button */}
				<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<h4 className="font-medium text-red-900 dark:text-red-200 mb-2">
						Sign Out All Devices
					</h4>
					<p className="text-sm text-red-700 dark:text-red-300 mb-3">
						This will sign you out from all devices and sessions.
						You'll need to log in again.
					</p>
					<Button
						onClick={handleLogoutAllDevices}
						disabled={
							signingOutAll || loadingDevicesList || refreshing
						}
						variant="destructive"
						size="sm"
						className="bg-red-600 hover:bg-red-700"
					>
						<LogOut className="h-4 w-4 mr-2" />
						{signingOutAll
							? "Signing Out..."
							: "Sign Out All Devices"}
					</Button>
				</div>

				{/* Active Devices */}
				<div className="flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-4 shrink-0">
						<h4 className="font-medium text-gray-900 dark:text-gray-200">
							Active Sessions
						</h4>
						<Button
							onClick={handleRefreshDevices}
							disabled={refreshing || loadingDevicesList}
							variant="outline"
							size="sm"
							className="border-gray-300 dark:border-gray-600"
						>
							{refreshing || loadingDevicesList
								? "Refreshing..."
								: "Refresh"}
						</Button>
					</div>

					<div className="flex-1 min-h-0 overflow-y-auto">
						{loadingDevicesList && devices.length === 0 ? (
							<div className="text-center py-8 text-gray-500 dark:text-gray-400">
								Loading devices...
							</div>
						) : devices.length === 0 ? (
							<div className="text-center py-8 text-gray-500 dark:text-gray-400">
								No active sessions found
							</div>
						) : (
							<div className="space-y-3">
								{devices.map((device) => (
									<div
										key={device.id}
										className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
									>
										<div className="flex items-center gap-3">
											<Monitor className="h-5 w-5 text-gray-500 dark:text-gray-400" />
											<div>
												<p className="font-medium text-gray-900 dark:text-gray-200">
													{device.deviceName ||
														"Unknown Device"}
												</p>
												<p className="text-sm text-gray-500 dark:text-gray-400">
													{device.userAgent?.slice(
														0,
														60
													)}
													...
												</p>
												<p className="text-xs text-gray-400 dark:text-gray-500">
													Last used:{" "}
													{new Date(
														device.lastUsed
													).toLocaleString()}
												</p>
											</div>
										</div>
										<Button
											onClick={() =>
												handleLogoutDevice(device.id)
											}
											disabled={
												refreshing ||
												loadingDevicesList ||
												signingOutAll ||
												loadingIndividualDevices.has(
													device.id
												)
											}
											variant="outline"
											size="sm"
											className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
										>
											{loadingIndividualDevices.has(
												device.id
											)
												? "Signing Out..."
												: "Sign Out"}
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
