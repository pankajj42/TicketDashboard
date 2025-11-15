import { useEffect } from "react";
import { connectRealtime } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import { useUser } from "@/store/auth.store";

export function useCreatedToasts(projectId: string | null | undefined) {
	const user = useUser();

	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock || !projectId) return;

		const onCreated = (p: any) => {
			try {
				if (!p?.ticketId) return;
				if (p?.actorId && user?.id && p.actorId === user.id) return; // skip self
				const actor = p?.actorName || "someone";
				const title = p?.ticketTitle || "ticket";
				toast.success(`New ticket by ${actor}: ${title}`);
			} catch {
				// ignore
			}
		};

		sock.on("ticket:created", onCreated);
		return () => {
			sock.off("ticket:created", onCreated);
		};
	}, [projectId, user?.id]);
}
