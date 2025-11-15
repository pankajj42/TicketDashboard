import { useEffect } from "react";
import { connectRealtime, getSocket } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";

export function useNotificationsRealtime(onNew: (n: any) => void) {
	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock) return;
		const handler = (payload: any) => onNew(payload);
		sock.on("notification:new", handler);
		return () => {
			getSocket()?.off("notification:new", handler);
		};
	}, [onNew]);
}
