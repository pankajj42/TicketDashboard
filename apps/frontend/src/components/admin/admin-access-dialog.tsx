import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export type AdminAccessDialogMode = "elevate" | "revoke";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: AdminAccessDialogMode;
}

export default function AdminAccessDialog({ open, onOpenChange, mode }: Props) {
	const { elevateAdmin, revokeAdmin } = useAuth();
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const isElevate = mode === "elevate";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isElevate) return;
		if (!password.trim()) return;
		setLoading(true);
		try {
			const res = await elevateAdmin(password.trim());
			if (res.success) {
				onOpenChange(false);
				setPassword("");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleRevoke = async () => {
		setLoading(true);
		try {
			await revokeAdmin();
			onOpenChange(false);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
				<DialogHeader>
					<DialogTitle className="text-gray-900 dark:text-gray-100">
						{isElevate ? "Admin access" : "Revoke admin access"}
					</DialogTitle>
					<DialogDescription className="text-gray-600 dark:text-gray-300">
						{isElevate
							? "Enter the admin password to elevate your privileges for 15 minutes."
							: "Revoking will immediately drop elevated privileges on this device. You can re-request elevation again if needed."}
					</DialogDescription>
				</DialogHeader>
				{isElevate ? (
					<form onSubmit={handleSubmit} className="space-y-4">
						<Input
							type="password"
							placeholder="Admin password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoFocus
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={loading}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={loading || !password.trim()}
							>
								{loading ? "Granting…" : "Grant admin access"}
							</Button>
						</DialogFooter>
					</form>
				) : (
					<div className="space-y-4">
						<p className="text-sm text-gray-700 dark:text-gray-300">
							Are you sure you want to revoke admin access now?
							Any in-progress admin actions will stop.
						</p>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={loading}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleRevoke}
								disabled={loading}
								variant="destructive"
							>
								{loading ? "Revoking…" : "Revoke now"}
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
