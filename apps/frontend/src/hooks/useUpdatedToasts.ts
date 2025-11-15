import { useEffect } from "react";
import { connectRealtime } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import { useUser } from "@/store/auth.store";

export function useUpdatedToasts(projectId: string | null | undefined) {
	const user = useUser();

	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock || !projectId) return;

		const onUpdated = (p: any) => {
			try {
				if (!p?.ticketId) return;
				if (p?.actorId && user?.id && p.actorId === user.id) return; // skip self
				const actor = p?.actorName || "someone";
				const title = p?.ticketTitle || "ticket";
				toast.success(`Ticket updated by ${actor}: ${title}`);
			} catch {
				// ignore
			}
		};

		sock.on("ticket:updated", onUpdated);
		return () => {
			sock.off("ticket:updated", onUpdated);
		};
	}, [projectId, user?.id]);
}
