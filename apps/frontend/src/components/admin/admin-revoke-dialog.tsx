import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function AdminRevokeDialog({ open, onOpenChange }: Props) {
	const { revokeAdmin } = useAuth();
	const [loading, setLoading] = useState(false);

	const onConfirm = async () => {
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
						Revoke admin access
					</DialogTitle>
					<DialogDescription className="text-gray-600 dark:text-gray-300">
						Revoking will immediately drop elevated privileges on
						this device. You can re-request elevation again if
						needed.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Are you sure you want to revoke admin access now? Any
						in-progress admin actions will stop.
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
							onClick={onConfirm}
							disabled={loading}
							variant="destructive"
						>
							{loading ? "Revoking…" : "Revoke now"}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
