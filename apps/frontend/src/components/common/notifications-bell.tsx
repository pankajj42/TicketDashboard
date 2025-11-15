import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useAccessToken } from "@/store/auth.store";
import { useNotificationStore } from "@/store/notification.store";
import { NotificationApiService } from "@/services/notification.api";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuSkeleton } from "../loading-skeletons";

export default function NotificationsBell() {
	const token = useAccessToken();
	const [isMarking, setIsMarking] = useState(false);
	const [loadingList, setLoadingList] = useState(false);
	const {
		items,
		unreadCount,
		setNotifications,
		addNotification,
		markAllReadLocal,
	} = useNotificationStore();

	// Stable callback for realtime notifications
	const handleRealtimeNotification = useCallback(
		(payload: any) => {
			if (!payload?.id) return;
			addNotification({
				id: payload.id,
				message: payload.message,
				read: payload.read ?? false,
				createdAt: payload.createdAt ?? new Date().toISOString(),
			});
		},
		[addNotification]
	);

	// Hook to subscribe to realtime events (must be at top-level, not inside another hook callback)
	useNotificationsRealtime(handleRealtimeNotification);

	useEffect(() => {
		if (!token) return;
		// Load all notifications for listing; unreadCount is derived in store
		setLoadingList(true);
		NotificationApiService.list(token, false)
			.then((res) => {
				setNotifications(res.notifications);
			})
			.finally(() => setLoadingList(false));
	}, [token, setNotifications]);

	async function markAllRead() {
		if (!token) return;
		try {
			setIsMarking(true);
			await NotificationApiService.markAllRead(token);
			markAllReadLocal();
		} finally {
			setIsMarking(false);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className="relative rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-800"
					disabled={isMarking}
					aria-busy={isMarking}
				>
					{isMarking ? (
						<Bell className="h-5 w-5 opacity-70 animate-pulse" />
					) : (
						<Bell className="h-5 w-5" />
					)}
					{unreadCount > 0 && (
						<span
							className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 ${isMarking ? "animate-pulse ring-2 ring-red-300/40" : ""}`}
						>
							{unreadCount}
						</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-80">
				<div className="px-2 py-1.5 flex items-center justify-between">
					<DropdownMenuLabel>Notifications</DropdownMenuLabel>
					<button
						className="text-xs inline-flex items-center gap-1 text-blue-600 hover:underline disabled:text-gray-400"
						onClick={markAllRead}
						disabled={isMarking}
					>
						{isMarking ? (
							<span className="inline-flex items-center gap-1">
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								Marking...
							</span>
						) : (
							<>
								<CheckCheck className="h-3.5 w-3.5" /> Mark all
								read
							</>
						)}
					</button>
				</div>
				<DropdownMenuSeparator />
				<div className="max-h-72 overflow-y-auto px-1">
					{loadingList ? (
						<DropdownMenuSkeleton items={4} />
					) : // Show only unread notifications
					items.filter((n) => !n.read).length === 0 ? (
						<div className="text-sm text-gray-600 dark:text-gray-400 px-2 py-6 text-center">
							No notifications yet
						</div>
					) : (
						items
							.filter((n) => !n.read)
							.map((n) => (
								<DropdownMenuItem
									key={n.id}
									className="flex flex-col items-start gap-0.5"
									disabled={isMarking}
								>
									<div
										className={
											n.read
												? "text-sm text-gray-600 dark:text-gray-400"
												: "text-sm text-gray-900 dark:text-gray-100"
										}
									>
										{n.message}
									</div>
									<div className="text-xs text-gray-500">
										{new Date(n.createdAt).toLocaleString()}
									</div>
								</DropdownMenuItem>
							))
					)}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
