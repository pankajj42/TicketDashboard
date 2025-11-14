import React, { useState } from "react";
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

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export default function AdminElevationDialog({ open, onOpenChange }: Props) {
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const { elevateAdmin } = useAuth();

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
				<DialogHeader>
					<DialogTitle className="text-gray-900 dark:text-gray-100">
						Admin access
					</DialogTitle>
					<DialogDescription className="text-gray-600 dark:text-gray-300">
						Enter the admin password to elevate your privileges for
						15 minutes.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
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
			</DialogContent>
		</Dialog>
	);
}
