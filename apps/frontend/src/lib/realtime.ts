import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";

let socket: Socket | null = null;

export function connectRealtime(baseUrl: string) {
	const token = useAuthStore.getState().accessToken;
	if (!token) return null;
	if (socket && socket.connected) return socket;
	socket = io(baseUrl, {
		withCredentials: true,
		autoConnect: true,
		transports: ["websocket"],
		auth: { token },
	});
	return socket;
}

export function getSocket(): Socket | null {
	return socket;
}

export function subscribeProject(projectId: string) {
	socket?.emit("subscribe", projectId);
}

export function unsubscribeProject(projectId: string) {
	socket?.emit("unsubscribe", projectId);
}
