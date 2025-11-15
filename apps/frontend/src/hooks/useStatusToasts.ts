import { useEffect } from "react";
import { connectRealtime } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import { useAccessToken, useUser } from "@/store/auth.store";

export function useStatusToasts(projectId: string | null | undefined) {
	const token = useAccessToken();
	const user = useUser();

	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock || !projectId) return;

		const onStatus = async (p: any) => {
			try {
				if (!p?.ticketId) return;
				if (p?.actorId && user?.id && p.actorId === user.id) return; // skip self
				const actor = p?.actorName || "someone";
				const from = p?.fromStatus || "";
				const to = p?.toStatus || p?.status || "";

				const titleSuffix = p?.ticketTitle ? ` — ${p.ticketTitle}` : "";
				toast.success(
					`Status changed by ${actor}: ${from} → ${to}${titleSuffix}`
				);
			} catch {
				// ignore
			}
		};

		sock.on("ticket:status", onStatus);
		return () => {
			sock.off("ticket:status", onStatus);
		};
	}, [projectId, token, user?.id]);
}
