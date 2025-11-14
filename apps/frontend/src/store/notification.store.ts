import { create } from "zustand";

type NotificationItem = {
	id: string;
	message: string;
	read: boolean;
	createdAt: string;
};

interface NotificationState {
	items: NotificationItem[];
	unreadCount: number;
	setNotifications: (n: NotificationItem[]) => void;
	addNotification: (n: NotificationItem) => void;
	markAllReadLocal: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
	items: [],
	unreadCount: 0,
	setNotifications: (items) =>
		set({ items, unreadCount: items.filter((i) => !i.read).length }),
	addNotification: (n) =>
		set((s) => {
			if (s.items.some((i) => i.id === n.id)) {
				return s; // dedup by id
			}
			return {
				items: [n, ...s.items],
				unreadCount: s.unreadCount + (n.read ? 0 : 1),
			};
		}),
	markAllReadLocal: () =>
		set((s) => ({
			items: s.items.map((i) => ({ ...i, read: true })),
			unreadCount: 0,
		})),
}));
