import React from "react";
import { Button } from "@/components/ui/button";
import { Monitor, LogOut } from "lucide-react";
import { AsyncButton } from "@/components/common/async-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccessToken } from "@/store/auth.store";
import { AuthApiService } from "@/services/auth.api";

type SecurityTabProps = {
	getUserDevices: () => Promise<any[]>;
	logoutFromDevice: (sessionId: string) => Promise<boolean>;
	logoutFromAllDevices: () => Promise<number>;
	onBusyChange?: (busy: boolean) => void;
};

export function SecurityTab({
	getUserDevices,
	logoutFromDevice,
	logoutFromAllDevices,
	onBusyChange,
}: SecurityTabProps) {
	const queryClient = useQueryClient();
	const [activeDeviceId, setActiveDeviceId] = React.useState<string | null>(
		null
	);
	const accessToken = useAccessToken();
	const [currentSessionId, setCurrentSessionId] = React.useState<
		string | null
	>(null);

	const devicesQuery = useQuery({
		queryKey: ["devices"],
		queryFn: getUserDevices,
		initialData: [],
	});

	// Fetch current session id to mark "This device"
	React.useEffect(() => {
		let mounted = true;
		(async () => {
			if (!accessToken) return;
			try {
				const me = await AuthApiService.getCurrentUser(accessToken);
				if (!mounted) return;
				const sid = (me as any)?.session?.sessionId || null;
				setCurrentSessionId(sid);
			} catch {
				// ignore
			}
		})();
		return () => {
			mounted = false;
		};
	}, [accessToken]);

	// Derived busy flags for disabling interactions across the dialog
	const isRefreshing = devicesQuery.isFetching || devicesQuery.isLoading;

	const signOutDevice = useMutation({
		mutationFn: async (sessionId: string) => logoutFromDevice(sessionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["devices"] });
		},
		onSettled: () => setActiveDeviceId(null),
	});

	const signOutAll = useMutation({
		mutationFn: async () => logoutFromAllDevices(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["devices"] });
		},
	});

	// Notify parent when this tab is busy (any action in progress)
	React.useEffect(() => {
		const busy =
			isRefreshing || signOutAll.isPending || signOutDevice.isPending;
		onBusyChange?.(busy);
	}, [
		isRefreshing,
		signOutAll.isPending,
		signOutDevice.isPending,
		onBusyChange,
	]);

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
					<AsyncButton
						onClick={async () => signOutAll.mutateAsync()}
						loading={signOutAll.isPending}
						disabled={isRefreshing || signOutDevice.isPending}
						variant="destructive"
						size="sm"
						className="bg-red-600 hover:bg-red-700"
						loadingText="Signing Out..."
						icon={<LogOut className="h-4 w-4" />}
					>
						Sign Out All Devices
					</AsyncButton>
				</div>

				{/* Active Devices */}
				<div className="flex flex-col min-h-0">
					<div className="flex items-center justify-between mb-4 shrink-0">
						<h4 className="font-medium text-gray-900 dark:text-gray-200">
							Active Sessions
						</h4>
						<Button
							onClick={() => devicesQuery.refetch()}
							disabled={
								isRefreshing ||
								signOutAll.isPending ||
								signOutDevice.isPending
							}
							variant="outline"
							size="sm"
							className="border-gray-300 dark:border-gray-600"
						>
							{devicesQuery.isFetching
								? "Refreshing..."
								: "Refresh"}
						</Button>
					</div>

					<div className="flex-1 min-h-0 overflow-y-auto">
						{devicesQuery.isLoading &&
						(devicesQuery.data?.length ?? 0) === 0 ? (
							<div className="text-center py-8 text-gray-500 dark:text-gray-400">
								Loading devices...
							</div>
						) : (devicesQuery.data?.length ?? 0) === 0 ? (
							<div className="text-center py-8 text-gray-500 dark:text-gray-400">
								No active sessions found
							</div>
						) : (
							<div className="space-y-3">
								{devicesQuery.data!.map((device: any) => (
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
													{currentSessionId ===
														device.id && (
														<span className="ml-2 inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white align-middle">
															This device
														</span>
													)}
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
										<AsyncButton
											onClick={async () => {
												setActiveDeviceId(device.id);
												await signOutDevice.mutateAsync(
													device.id
												);
											}}
											loading={
												signOutDevice.isPending &&
												activeDeviceId === device.id
											}
											disabled={
												isRefreshing ||
												signOutAll.isPending ||
												signOutDevice.isPending
											}
											variant="outline"
											size="sm"
											className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
											loadingText="Signing Out..."
										>
											Sign Out
										</AsyncButton>
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
