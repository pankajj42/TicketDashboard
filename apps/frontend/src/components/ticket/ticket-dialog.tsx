import { useEffect, useMemo, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	useAccessToken,
	useIsAdminElevated,
	useAdminToken,
	useClearAdminElevation,
} from "@/store/auth.store";
import { ApiError } from "@/services/http";
import { toast } from "sonner";
import { httpClient } from "@/services/http";
import { CommentApiService } from "@/services/comment.api";
import { UserApiService } from "@/services/user.api";
import { TicketApiService } from "@/services/ticket.api";
import { TextSkeleton } from "../loading-skeletons";
import { Loader2 } from "lucide-react";
import { getSocket } from "@/lib/realtime";

type Props = { ticketId: string | null; onClose: () => void };

export default function TicketDialog({ ticketId, onClose }: Props) {
	const token = useAccessToken();
	const isAdmin = useIsAdminElevated();
	const adminToken = useAdminToken();
	const clearAdminElevation = useClearAdminElevation();
	const [ticket, setTicket] = useState<any>(null);
	const [comments, setComments] = useState<any[]>([]);
	const [updates, setUpdates] = useState<any[]>([]);
	const [body, setBody] = useState("");
	const [loadingTicket, setLoadingTicket] = useState(false);
	const [loadingComments, setLoadingComments] = useState(false);
	const [submittingComment, setSubmittingComment] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [savingEdits, setSavingEdits] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [activeTab, setActiveTab] = useState<
		"details" | "comments" | "updates"
	>("details");
	const [users, setUsers] = useState<
		Array<{ id: string; email: string; username: string }>
	>([]);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [assigning, setAssigning] = useState(false);
	const [usersError, setUsersError] = useState<string | null>(null);
	const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
	const commentsRef = useRef<HTMLDivElement | null>(null);
	const detailsTabRef = useRef<HTMLButtonElement | null>(null);
	const commentsTabRef = useRef<HTMLButtonElement | null>(null);
	const updatesTabRef = useRef<HTMLButtonElement | null>(null);

	const visibleTabs = useMemo(() => {
		const base = [
			{ key: "details" as const, label: "Details", ref: detailsTabRef },
			{
				key: "comments" as const,
				label: "Comments",
				ref: commentsTabRef,
			},
		];
		return isAdmin
			? [
					...base,
					{
						key: "updates" as const,
						label: "Updates",
						ref: updatesTabRef,
					},
				]
			: base;
	}, [isAdmin]);

	function focusTabByIndex(idx: number) {
		const item = visibleTabs[idx];
		if (!item) return;
		setActiveTab(item.key);
		item.ref.current?.focus();
	}

	function onTabListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		const currentIndex = visibleTabs.findIndex((t) => t.key === activeTab);
		if (e.key === "ArrowRight") {
			e.preventDefault();
			focusTabByIndex((currentIndex + 1) % visibleTabs.length);
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			focusTabByIndex(
				(currentIndex - 1 + visibleTabs.length) % visibleTabs.length
			);
		} else if (e.key === "Home") {
			e.preventDefault();
			focusTabByIndex(0);
		} else if (e.key === "End") {
			e.preventDefault();
			focusTabByIndex(visibleTabs.length - 1);
		}
	}

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
				setEditTitle(t.ticket?.title || "");
				setEditDescription(t.ticket?.description || "");
				setSelectedAssigneeId(t.ticket?.assignedTo?.id || "");
			} finally {
				setLoadingTicket(false);
			}
			setLoadingComments(true);
			try {
				const c = await CommentApiService.list(ticketId, token);
				setComments(c.comments ?? []);
				if (isAdmin) {
					try {
						const u = await httpClient.get<{ updates: any[] }>(
							`/tickets/${ticketId}/updates`,
							{ Authorization: `Bearer ${token}` }
						);
						setUpdates(u.updates);
					} catch (e: any) {
						// Silently ignore 404 for missing updates endpoint; treat as no updates
						if (e?.status !== 404) {
							toast.error(
								"Failed to load ticket updates. Some audit details may be missing."
							);
						}
						setUpdates([]);
					}
				}
			} finally {
				setLoadingComments(false);
			}
		})();
		setActiveTab("details");
	}, [ticketId, token, isAdmin]);

	// Realtime updates for comments and ticket edits
	useEffect(() => {
		const socket = getSocket();
		if (!socket || !ticketId) return;
		function onComment(evt: any) {
			if (evt?.ticketId !== ticketId) return;
			setComments((prev) => [
				...prev,
				{
					id: evt.commentId || Math.random().toString(36).slice(2),
					body: evt.body,
					createdAt: evt.createdAt || new Date().toISOString(),
					author: { username: evt.actorName || "Someone" },
				},
			]);
		}
		function onUpdated(evt: any) {
			if (evt?.ticketId !== ticketId) return;
			setTicket((prev: any) =>
				prev
					? {
							...prev,
							title:
								typeof evt.ticketTitle === "string"
									? evt.ticketTitle
									: prev.title,
							description:
								typeof evt.description === "string"
									? evt.description
									: prev.description,
						}
					: prev
			);
			if (typeof evt.ticketTitle === "string")
				setEditTitle(evt.ticketTitle);
			if (typeof evt.description === "string")
				setEditDescription(evt.description);
		}
		socket.on("ticket:comment", onComment);
		socket.on("ticket:updated", onUpdated);
		return () => {
			socket.off("ticket:comment", onComment);
			socket.off("ticket:updated", onUpdated);
		};
	}, [ticketId]);

	useEffect(() => {
		if (!isAdmin || !token || !ticketId) return;
		setLoadingUsers(true);
		setUsersError(null);
		UserApiService.list(token, adminToken || undefined)
			.then((res) => {
				setUsers(res.users || []);
				if ((res.users || []).length === 0 && !adminToken) {
					setUsersError(
						"No users available. Admin elevation may be required."
					);
				}
			})
			.catch((err: any) => {
				if (err && typeof err === "object" && "status" in err) {
					const status = (err as ApiError).status;
					if (status === 401 && adminToken) {
						clearAdminElevation();
						toast.error(
							"Admin elevation expired. Please re-elevate to load users."
						);
						return;
					}
				}
				setUsersError(
					err?.message || "Failed to load users. Try again later."
				);
				toast.error(
					err?.message || "Failed to load users. Try again later."
				);
			})
			.finally(() => setLoadingUsers(false));
	}, [isAdmin, token, ticketId, adminToken]);

	useEffect(() => {
		if (activeTab !== "comments") return;
		const el = commentsRef.current;
		if (!el) return;
		const id = window.setTimeout(() => {
			el.scrollTop = el.scrollHeight;
		}, 40);
		return () => window.clearTimeout(id);
	}, [activeTab, comments]);

	const orderedComments = useMemo(() => {
		if (!Array.isArray(comments)) return [] as any[];
		if (comments.length && comments[0] && comments[0].createdAt) {
			return [...comments].sort(
				(a: any, b: any) =>
					new Date(a.createdAt).getTime() -
					new Date(b.createdAt).getTime()
			);
		}
		return comments;
	}, [comments]);

	function initialsFrom(name?: string | null, email?: string | null) {
		const source =
			(name && name.trim()) || (email && email.split("@")[0]) || "?";
		const parts = source.split(/\s+/).filter(Boolean);
		if (!parts.length) return "?";
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}

	function formatDateTime(v?: string) {
		if (!v) return "";
		try {
			return new Date(v).toLocaleString();
		} catch {
			return String(v);
		}
	}

	function safeParseJSON<T = any>(raw: any): T | undefined {
		if (!raw) return undefined;
		try {
			return typeof raw === "string"
				? (JSON.parse(raw) as T)
				: (raw as T);
		} catch {
			return undefined;
		}
	}

	async function submitComment() {
		if (!ticketId || !token || !body.trim()) return;
		try {
			setSubmittingComment(true);
			await CommentApiService.add(ticketId, { body }, token);
			setBody("");
			const c = await CommentApiService.list(ticketId, token);
			setComments(c.comments ?? []);
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
					<div
						role="tablist"
						aria-label="Ticket sections"
						onKeyDown={onTabListKeyDown}
						className="flex items-center gap-2 border-b pb-2"
					>
						{visibleTabs.map((t) => (
							<button
								key={t.key}
								ref={t.ref}
								role="tab"
								id={`tab-${t.key}`}
								aria-controls={`panel-${t.key}`}
								aria-selected={activeTab === t.key}
								tabIndex={activeTab === t.key ? 0 : -1}
								className={`px-2 py-1 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600 ${activeTab === t.key ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
								onClick={() => setActiveTab(t.key)}
							>
								{t.label}
							</button>
						))}
					</div>

					{activeTab === "details" && (
						<div
							id="panel-details"
							role="tabpanel"
							aria-labelledby="tab-details"
							className="space-y-2"
						>
							{loadingTicket ? (
								<>
									<TextSkeleton lines={3} />
									<TextSkeleton lines={1} className="w-1/2" />
								</>
							) : (
								<>
									<div className="flex items-start justify-between gap-3">
										<div className="flex-1">
											{!isEditing ? (
												<>
													<div className="text-base font-medium mb-1">
														{ticket?.title}
													</div>
													<div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
														{ticket?.description}
													</div>
												</>
											) : (
												<div className="space-y-2">
													<label
														htmlFor="edit-title"
														className="sr-only"
													>
														Title
													</label>
													<input
														id="edit-title"
														className="w-full border rounded px-2 py-1"
														value={editTitle}
														onChange={(e) =>
															setEditTitle(
																e.target.value
															)
														}
														placeholder="Title"
														disabled={savingEdits}
													/>
													<label
														htmlFor="edit-description"
														className="sr-only"
													>
														Description
													</label>
													<textarea
														id="edit-description"
														className="w-full border rounded px-2 py-1 min-h-24"
														value={editDescription}
														onChange={(e) =>
															setEditDescription(
																e.target.value
															)
														}
														placeholder="Description"
														disabled={savingEdits}
													/>
												</div>
											)}
										</div>
										<div className="shrink-0">
											{!isEditing ? (
												<button
													className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-60"
													onClick={() =>
														setIsEditing(true)
													}
												>
													Edit
												</button>
											) : (
												<div className="flex items-center gap-2">
													<button
														className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-60"
														disabled={savingEdits}
														onClick={async () => {
															if (
																!ticketId ||
																!token
															)
																return;
															try {
																setSavingEdits(
																	true
																);
																await TicketApiService.updateDetails(
																	ticketId,
																	{
																		title: editTitle,
																		description:
																			editDescription,
																	},
																	token
																);
																setTicket(
																	(
																		prev: any
																	) =>
																		prev
																			? {
																					...prev,
																					title: editTitle,
																					description:
																						editDescription,
																				}
																			: prev
																);
																setIsEditing(
																	false
																);
																toast.success(
																	"Ticket details updated"
																);
															} catch (e: any) {
																toast.error(
																	e?.message ||
																		"Failed to update ticket"
																);
															} finally {
																setSavingEdits(
																	false
																);
															}
														}}
													>
														{savingEdits ? (
															<span className="inline-flex items-center">
																<Loader2 className="mr-2 h-4 w-4 animate-spin" />
																Saving...
															</span>
														) : (
															"Save"
														)}
													</button>
													<button
														className="px-3 py-1 rounded border text-sm disabled:opacity-60"
														disabled={savingEdits}
														onClick={() => {
															setIsEditing(false);
															setEditTitle(
																ticket?.title ||
																	""
															);
															setEditDescription(
																ticket?.description ||
																	""
															);
														}}
													>
														Cancel
													</button>
												</div>
											)}
										</div>
									</div>
									<div className="text-xs text-gray-500">
										Created by:{" "}
										{ticket?.createdBy?.username} | Assigned
										to:{" "}
										{ticket?.assignedTo?.username || "—"}
									</div>
									{isAdmin && (
										<div className="mt-3 border-t pt-3">
											<div className="text-sm font-medium mb-1">
												Change assignee
											</div>
											<div className="flex items-center gap-2">
												<select
													className="border rounded px-2 py-1 text-sm min-w-40"
													value={selectedAssigneeId}
													onChange={(e) =>
														setSelectedAssigneeId(
															e.target.value
														)
													}
													disabled={
														assigning ||
														loadingUsers ||
														ticket?.status ===
															"PROPOSED"
													}
												>
													<option value="">
														Unassigned
													</option>
													{users.map((u) => (
														<option
															key={u.id}
															value={u.id}
														>
															{u.username} (
															{u.email})
														</option>
													))}
												</select>
												<button
													className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-60"
													disabled={
														assigning ||
														ticket?.status ===
															"PROPOSED"
													}
													onClick={async () => {
														if (!ticketId || !token)
															return;
														try {
															setAssigning(true);
															await TicketApiService.assignAndStatus(
																ticketId,
																{
																	userId:
																		selectedAssigneeId ||
																		null,
																	status: selectedAssigneeId
																		? undefined
																		: "PROPOSED",
																},
																token
															);
															const newlyAssigned =
																selectedAssigneeId
																	? users.find(
																			(
																				u
																			) =>
																				u.id ===
																				selectedAssigneeId
																		) ||
																		null
																	: null;
															setTicket(
																(prev: any) =>
																	prev
																		? {
																				...prev,
																				assignedTo:
																					newlyAssigned
																						? {
																								id: newlyAssigned.id,
																								username:
																									newlyAssigned.username,
																								email: newlyAssigned.email,
																							}
																						: null,
																			}
																		: prev
															);
														} finally {
															setAssigning(false);
														}
													}}
												>
													{assigning ? (
														<span className="inline-flex items-center">
															<Loader2 className="mr-2 h-4 w-4 animate-spin" />
															Assigning...
														</span>
													) : (
														"Assign"
													)}
												</button>
											</div>
											{ticket?.status === "PROPOSED" && (
												<div className="text-xs text-red-500 mt-1">
													Cannot assign while status
													is PROPOSED. Change status
													first.
												</div>
											)}
											{loadingUsers && (
												<div className="text-xs text-gray-500 mt-1">
													Loading users...
												</div>
											)}
											{!loadingUsers && usersError && (
												<div className="text-xs text-red-500 mt-1">
													{usersError}
												</div>
											)}
											{!loadingUsers &&
												!usersError &&
												users.length === 0 && (
													<div className="text-xs text-gray-500 mt-1">
														No users found.
													</div>
												)}
										</div>
									)}
								</>
							)}
						</div>
					)}

					{activeTab === "comments" && (
						<div
							id="panel-comments"
							role="tabpanel"
							aria-labelledby="tab-comments"
						>
							<div
								ref={commentsRef}
								className="space-y-2 max-h-60 overflow-y-auto pr-1"
							>
								{loadingComments ? (
									<>
										<TextSkeleton lines={1} />
										<TextSkeleton lines={1} />
										<TextSkeleton lines={1} />
									</>
								) : (
									orderedComments.map((c) => {
										const username =
											c.author?.username ?? "Unknown";
										const email = c.author?.email ?? null;
										const initials = initialsFrom(
											username,
											email
										);
										return (
											<div
												key={c.id}
												className="flex items-start gap-2"
											>
												<div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 flex items-center justify-center text-xs font-semibold">
													{initials}
												</div>
												<div className="flex-1">
													<div className="text-sm p-2 border rounded-md">
														{c.body}
													</div>
												</div>
												<div className="ml-2 text-xs text-gray-500 whitespace-nowrap self-start">
													{username}
												</div>
											</div>
										);
									})
								)}
							</div>
							<div className="mt-2 flex gap-2">
								<label
									htmlFor="new-comment"
									className="sr-only"
								>
									Add a comment
								</label>
								<input
									id="new-comment"
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
					)}

					{isAdmin && activeTab === "updates" && (
						<div
							id="panel-updates"
							role="tabpanel"
							aria-labelledby="tab-updates"
						>
							{loadingComments ? (
								<div className="space-y-2 max-h-40 overflow-y-auto text-xs">
									<TextSkeleton lines={1} />
									<TextSkeleton lines={1} />
								</div>
							) : (
								<div className="space-y-2 max-h-40 overflow-y-auto text-xs pr-1">
									{updates.map((u) => {
										const content = safeParseJSON(
											u.content
										) as any;
										let summary = "";
										switch (u.type) {
											case "STATUS_CHANGED": {
												const from = u.oldStatus ?? "—";
												const to = u.newStatus ?? "—";
												summary = `Status: ${from} → ${to}`;
												break;
											}
											case "ASSIGNMENT_CHANGED": {
												const from =
													u.oldAssigneeName ?? "—";
												const to =
													u.newAssigneeName ?? "—";
												summary = `Assignment: ${from} → ${to}`;
												break;
											}
											case "COMMENT": {
												const snip = content?.snippet
													? String(content.snippet)
													: "Comment added";
												summary = `Comment: ${snip}`;
												break;
											}
											case "UPDATED": {
												const keys = content
													? Object.keys(content)
													: [];
												summary = keys.length
													? `Updated: ${keys.join(", ")}`
													: "Details updated";
												break;
											}
											default: {
												summary = String(
													u.type || "Update"
												);
											}
										}
										return (
											<div
												key={u.id}
												className="p-2 border rounded"
											>
												<div className="text-[11px] text-gray-500 mb-1">
													{u.updatedBy?.username} ·{" "}
													{formatDateTime(
														u.createdAt
													)}
												</div>
												<div>{summary}</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
