import { useEffect } from "react";
import { connectRealtime } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import { useUser } from "@/store/auth.store";

export function useAssignmentToasts() {
	const user = useUser();

	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock) return;

		const onAssignment = async (p: any) => {
			try {
				if (!p?.ticketId) return;
				if (p?.actorId && user?.id && p.actorId === user.id) return; // skip self
				const title = p?.ticketTitle || "ticket";

				if (p?.assignedToId && user?.id && p.assignedToId === user.id) {
					toast.success(`Assigned to you: ${title}`);
					return;
				}
				if (p?.assignedToId == null) {
					toast(`Assignment cleared: ${title}`);
					return;
				}
				const assignee = p?.assignedToName || "user";
				toast.success(`Assigned to ${assignee}: ${title}`);
			} catch {
				// non-blocking toast; ignore errors
			}
		};

		sock.on("ticket:assignment", onAssignment);
		return () => {
			sock.off("ticket:assignment", onAssignment);
		};
	}, [user?.id]);
}
