import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAccessToken, useIsAdminElevated } from "@/store/auth.store";
import { httpClient } from "@/services/http";
import { CommentApiService } from "@/services/comment.api";
import { TextSkeleton } from "../loading-skeletons";
import { Loader2 } from "lucide-react";

type Props = { ticketId: string | null; onClose: () => void };

export default function TicketDialog({ ticketId, onClose }: Props) {
	const token = useAccessToken();
	const isAdmin = useIsAdminElevated();
	const [ticket, setTicket] = useState<any>(null);
	const [comments, setComments] = useState<any[]>([]);
	const [updates, setUpdates] = useState<any[]>([]);
	const [body, setBody] = useState("");
	const [loadingTicket, setLoadingTicket] = useState(false);
	const [loadingComments, setLoadingComments] = useState(false);
	const [submittingComment, setSubmittingComment] = useState(false);

	useEffect(() => {
		if (!ticketId || !token) return;
		(async () => {
			setLoadingTicket(true);
			try {
				const t = await httpClient.get<{ ticket: any }>(
					`/tickets/${ticketId}`,
					{ Authorization: `Bearer ${token}` }
				);
				setTicket(t.ticket);
			} finally {
				setLoadingTicket(false);
			}
			setLoadingComments(true);
			try {
				const c = await CommentApiService.list(ticketId, token);
				setComments(c.comments);
				if (isAdmin) {
					const u = await httpClient.get<{ updates: any[] }>(
						`/tickets/${ticketId}/updates`,
						{ Authorization: `Bearer ${token}` }
					);
					setUpdates(u.updates);
				}
			} finally {
				setLoadingComments(false);
			}
		})();
	}, [ticketId, token, isAdmin]);

	async function submitComment() {
		if (!ticketId || !token || !body.trim()) return;
		try {
			setSubmittingComment(true);
			await CommentApiService.add(ticketId, { body }, token);
			setBody("");
			const c = await CommentApiService.list(ticketId, token);
			setComments(c.comments);
		} finally {
			setSubmittingComment(false);
		}
	}

	return (
		<Dialog open={!!ticketId} onOpenChange={() => onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{ticket?.title || "Ticket"}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{loadingTicket ? (
						<>
							<TextSkeleton lines={3} />
							<TextSkeleton lines={1} className="w-1/2" />
						</>
					) : (
						<>
							<div className="text-sm text-gray-700 dark:text-gray-300">
								{ticket?.description}
							</div>
							<div className="text-xs text-gray-500">
								Created by: {ticket?.createdBy?.username} |
								Assigned to:{" "}
								{ticket?.assignedTo?.username || "—"}
							</div>
						</>
					)}
					<div>
						<div className="font-medium mb-2">Comments</div>
						{loadingComments ? (
							<div className="space-y-2 max-h-60 overflow-y-auto">
								<TextSkeleton lines={1} />
								<TextSkeleton lines={1} />
								<TextSkeleton lines={1} />
							</div>
						) : (
							<div className="space-y-2 max-h-60 overflow-y-auto">
								{comments.map((c) => (
									<div
										key={c.id}
										className="text-sm p-2 border rounded-md"
									>
										{c.body}
									</div>
								))}
							</div>
						)}
						<div className="mt-2 flex gap-2">
							<input
								className="flex-1 border rounded px-2 py-1"
								value={body}
								onChange={(e) => setBody(e.target.value)}
								placeholder="Add a comment"
							/>
							<button
								className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-60"
								onClick={submitComment}
								disabled={submittingComment}
							>
								{submittingComment ? (
									<span className="inline-flex items-center">
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Sending...
									</span>
								) : (
									"Send"
								)}
							</button>
						</div>
					</div>
					{isAdmin && (
						<div>
							<div className="font-medium mb-2">
								Updates (Admin)
							</div>
							{loadingComments ? (
								<div className="space-y-2 max-h-40 overflow-y-auto text-xs">
									<TextSkeleton lines={1} />
									<TextSkeleton lines={1} />
								</div>
							) : (
								<div className="space-y-2 max-h-40 overflow-y-auto text-xs">
									{updates.map((u) => (
										<div
											key={u.id}
											className="p-2 border rounded"
										>
											<div>
												{u.type} by{" "}
												{u.updatedBy?.username} at{" "}
												{new Date(
													u.createdAt
												).toLocaleString()}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
