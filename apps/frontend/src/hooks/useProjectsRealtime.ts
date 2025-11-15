import { useEffect } from "react";
import {
	connectRealtime,
	subscribeProject,
	unsubscribeProject,
} from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { useProjectStore } from "@/store/project.store";
import { useUser } from "@/store/auth.store";
import { toast } from "sonner";

export function useProjectsRealtime() {
	const user = useUser();
	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock) return;

		// On connect/reconnect, hard-sync projects to avoid drift
		const onConnect = () => {
			try {
				useProjectStore.getState().loadProjects();
			} catch {}
		};
		sock.on("connect", onConnect);

		const onCreated = (p: any) => {
			const pr = p?.project;
			if (!pr?.id) return;
			useProjectStore.setState((s) => ({
				projects: [
					{
						...pr,
						isSubscribed: false,
						subscriberCount:
							typeof p?.subscriberCount === "number"
								? p.subscriberCount
								: 0,
					},
					...s.projects,
				],
			}));
			const who = p?.actorName || "someone";
			toast.success(`Project created by ${who}: ${pr.name}`);
		};
		const onUpdated = (p: any) => {
			const pr = p?.project;
			if (!pr?.id) return;
			useProjectStore.setState((s) => ({
				projects: s.projects.map((x) =>
					x.id === pr.id
						? { ...x, name: pr.name, description: pr.description }
						: x
				),
			}));
			const who = p?.actorName || "someone";
			toast.success(`Project updated by ${who}: ${pr.name}`);
		};

		sock.on("project:created", onCreated);
		sock.on("project:updated", onUpdated);

		// Reflect subscription changes in realtime
		const onMemberSubscribed = (p: any) => {
			if (!p?.projectId) return;
			useProjectStore.setState((s) => ({
				projects: s.projects.map((x) =>
					x.id === p.projectId
						? {
								...x,
								subscriberCount:
									typeof p?.subscriberCount === "number"
										? p.subscriberCount
										: ((x as any).subscriberCount ?? 0),
							}
						: x
				),
			}));
			if (p?.userId && p.userId === user?.id) {
				useProjectStore.setState((s) => ({
					projects: s.projects.map((x) =>
						x.id === p.projectId ? { ...x, isSubscribed: true } : x
					),
				}));
				// Ensure this client socket joins the project room
				subscribeProject(p.projectId);
				toast.success("Subscribed to project");
			}
		};
		const onMemberUnsubscribed = (p: any) => {
			if (!p?.projectId) return;
			useProjectStore.setState((s) => ({
				projects: s.projects.map((x) =>
					x.id === p.projectId
						? {
								...x,
								subscriberCount:
									typeof p?.subscriberCount === "number"
										? p.subscriberCount
										: ((x as any).subscriberCount ?? 0),
							}
						: x
				),
			}));
			if (p?.userId && p.userId === user?.id) {
				useProjectStore.setState((s) => ({
					projects: s.projects.map((x) =>
						x.id === p.projectId ? { ...x, isSubscribed: false } : x
					),
				}));
				// Ensure this client socket leaves the project room
				unsubscribeProject(p.projectId);
				toast.success("Unsubscribed from project");
			}
		};
		sock.on("project:member:subscribed", onMemberSubscribed);
		sock.on("project:member:unsubscribed", onMemberUnsubscribed);
		return () => {
			sock.off("connect", onConnect);
			sock.off("project:created", onCreated);
			sock.off("project:updated", onUpdated);
			sock.off("project:member:subscribed", onMemberSubscribed);
			sock.off("project:member:unsubscribed", onMemberUnsubscribed);
		};
	}, [user?.id]);
}
