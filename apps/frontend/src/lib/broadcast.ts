// BroadcastChannel utility for cross-tab sync
// Handles admin elevation/revocation and user profile updates.

export type BroadcastEvent =
	| { type: "admin:elevated"; adminExpiresAt: string }
	| { type: "admin:revoked" }
	| {
			type: "user:profileUpdated";
			user: { username: string; email: string };
	  };

const CHANNEL_NAME = "app-sync";
let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
	if (typeof window === "undefined" || !(window as any).BroadcastChannel)
		return null;
	if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
	return channel;
}

export function broadcast(event: BroadcastEvent): void {
	const ch = ensureChannel();
	if (!ch) return; // no-op if unsupported
	try {
		ch.postMessage(event);
	} catch (e) {
		// Silently ignore broadcast errors
		console.warn("[broadcast] failed to post message", e);
	}
}

export function subscribe(handler: (ev: BroadcastEvent) => void): () => void {
	const ch = ensureChannel();
	if (!ch) return () => {};
	const listener = (e: MessageEvent) => {
		const data = e.data as BroadcastEvent;
		if (!data || typeof data !== "object" || !("type" in data)) return;
		handler(data);
	};
	ch.addEventListener("message", listener);
	return () => ch.removeEventListener("message", listener);
}

// Optional: expose a close function if needed
export function closeBroadcast(): void {
	if (channel) {
		channel.close();
		channel = null;
	}
}
