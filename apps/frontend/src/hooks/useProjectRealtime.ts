import { useEffect, useRef } from "react";
import {
	connectRealtime,
	subscribeProject,
	unsubscribeProject,
} from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { useProjectStore } from "@/store/project.store";
// no local toasts here to avoid duplication with global membership toasts

type Handlers = {
	onTicketCreated?: (ticketId: string) => void;
	onTicketUpdated?: (ticketId: string) => void;
	onTicketStatus?: (ticketId: string, status: string) => void;
};

export function useProjectRealtime(
	projectId: string | null | undefined,
	handlers: Handlers = {}
) {
	const lastProjectIdRef = useRef<string | null>(null);

	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock) return;

		// Helper to (re)subscribe to the current project
		const ensureSubscribed = () => {
			if (!projectId) return;
			// If project changed, leave previous
			if (
				lastProjectIdRef.current &&
				lastProjectIdRef.current !== projectId
			) {
				unsubscribeProject(lastProjectIdRef.current);
			}
			subscribeProject(projectId);
			lastProjectIdRef.current = projectId;
		};

		// Initial subscribe (and when projectId changes)
		ensureSubscribed();

		// Also guard on connect/reconnect in case rooms were lost
		const onConnect = () => ensureSubscribed();
		const onReconnect = () => ensureSubscribed();
		sock.on("connect", onConnect);
		// socket.io v4 still emits 'reconnect' on the Socket; safe to listen
		sock.on("reconnect", onReconnect as any);

		const onCreated = (p: any) =>
			p?.ticketId && handlers.onTicketCreated?.(p.ticketId);
		const onUpdated = (p: any) =>
			p?.ticketId && handlers.onTicketUpdated?.(p.ticketId);
		const onStatus = (p: any) =>
			p?.ticketId &&
			p?.status &&
			handlers.onTicketStatus?.(p.ticketId, p.status);

		sock.on("ticket:created", onCreated);
		sock.on("ticket:updated", onUpdated);
		sock.on("ticket:status", onStatus);

		// Keep project subscription flags in store (no local toast to avoid duplicates)
		const onProjectSubscribed = (p: any) => {
			if (!p?.projectId) return;
			useProjectStore.setState((s) => ({
				projects: s.projects.map((pr) =>
					pr.id === p.projectId ? { ...pr, isSubscribed: true } : pr
				),
			}));
		};
		const onProjectUnsubscribed = (p: any) => {
			if (!p?.projectId) return;
			useProjectStore.setState((s) => ({
				projects: s.projects.map((pr) =>
					pr.id === p.projectId ? { ...pr, isSubscribed: false } : pr
				),
			}));
		};
		sock.on("project:subscribed", onProjectSubscribed);
		sock.on("project:unsubscribed", onProjectUnsubscribed);

		return () => {
			sock.off("connect", onConnect);
			sock.off("reconnect", onReconnect as any);
			sock.off("ticket:created", onCreated);
			sock.off("ticket:updated", onUpdated);
			sock.off("ticket:status", onStatus);
			sock.off("project:subscribed", onProjectSubscribed);
			sock.off("project:unsubscribed", onProjectUnsubscribed);
		};
	}, [
		projectId,
		handlers.onTicketCreated,
		handlers.onTicketUpdated,
		handlers.onTicketStatus,
	]);
}
