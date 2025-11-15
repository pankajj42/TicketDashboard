import { useEffect } from "react";
import { connectRealtime, getSocket } from "@/lib/realtime";
import { API_CONFIG } from "@/lib/constants";
import { useClearAdminElevation } from "@/store/auth.store";
import { toast } from "sonner";

export function useAdminRealtime() {
	const clearAdmin = useClearAdminElevation();
	useEffect(() => {
		const sock = connectRealtime(API_CONFIG.BASE_URL);
		if (!sock) return;
		const onRevoked = (_payload: any) => {
			clearAdmin();
			toast("Admin access expired or revoked");
		};
		sock.on("admin:revoked", onRevoked);
		return () => {
			getSocket()?.off("admin:revoked", onRevoked);
		};
	}, [clearAdmin]);
}
