import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ProjectApiService } from "@/services/project.api";
import { useAccessToken } from "@/store/auth.store";
import { useProjectStore } from "@/store/project.store";
import { toast } from "sonner";

export default function EditProjectDialog() {
	const token = useAccessToken();
	const { loadProjects } = useProjectStore();
	const [open, setOpen] = useState(false);
	const [projectId, setProjectId] = useState<string>("");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState<"details" | "subscribers">(
		"details"
	);
	const [subsLoading, setSubsLoading] = useState(false);
	const [subscribers, setSubscribers] = useState<
		Array<{ id: string; email: string; username: string }>
	>([]);

	useEffect(() => {
		const handler = (e: any) => {
			const { id, name, description } = e.detail || {};
			setProjectId(id);
			setName(name || "");
			setDescription(description || "");
			setOpen(true);
			setActiveTab("details");
		};
		window.addEventListener("project:edit", handler as any);
		return () => window.removeEventListener("project:edit", handler as any);
	}, []);

	useEffect(() => {
		if (!open || activeTab !== "subscribers" || !projectId || !token)
			return;
		setSubsLoading(true);
		ProjectApiService.getSubscribers(projectId, token)
			.then((res) => setSubscribers(res.users || []))
			.catch(() => {})
			.finally(() => setSubsLoading(false));
	}, [open, activeTab, projectId, token]);

	async function onSave() {
		if (!token || !projectId) return;
		setSaving(true);
		try {
			const payload: { name?: string; description?: string | null } = {};
			if (name.trim().length > 0) payload.name = name.trim();
			payload.description = description.trim() || null;
			await ProjectApiService.update(projectId, payload, token);
			toast.success("Project saved");
			await loadProjects();
			setOpen(false);
		} catch (e: any) {
			toast.error(e?.message || "Failed to save project");
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(val: boolean) => !saving && setOpen(val)}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Project</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div className="flex items-center gap-2 border-b pb-2">
						<button
							className={`px-2 py-1 rounded-md text-sm ${
								activeTab === "details"
									? "bg-gray-200 dark:bg-gray-700"
									: "hover:bg-gray-100 dark:hover:bg-gray-800"
							}`}
							onClick={() => setActiveTab("details")}
						>
							Details
						</button>
						<button
							className={`px-2 py-1 rounded-md text-sm ${
								activeTab === "subscribers"
									? "bg-gray-200 dark:bg-gray-700"
									: "hover:bg-gray-100 dark:hover:bg-gray-800"
							}`}
							onClick={() => setActiveTab("subscribers")}
						>
							Subscribers
						</button>
					</div>
					{activeTab === "details" && (
						<div>
							<label className="block text-sm mb-1">Title</label>
							<input
								className="w-full border rounded px-2 py-1 disabled:opacity-60"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={saving}
							/>
						</div>
					)}
					{activeTab === "details" && (
						<div>
							<label className="block text-sm mb-1">
								Description
							</label>
							<textarea
								className="w-full border rounded px-2 py-1 disabled:opacity-60"
								rows={4}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={saving}
							/>
						</div>
					)}
					{activeTab === "subscribers" && (
						<div className="max-h-64 overflow-y-auto pr-1">
							{subsLoading ? (
								<p className="text-sm text-gray-500">
									Loading...
								</p>
							) : subscribers.length === 0 ? (
								<p className="text-sm text-gray-500">
									No subscribers
								</p>
							) : (
								<ul className="text-sm space-y-1">
									{subscribers.map((u) => (
										<li
											key={u.id}
											className="flex items-center gap-2 border rounded px-2 py-1"
										>
											<span className="font-medium">
												{u.username}
											</span>
											<span className="text-gray-500">
												{u.email}
											</span>
										</li>
									))}
								</ul>
							)}
						</div>
					)}
					{activeTab === "details" && (
						<div className="flex justify-end gap-2">
							<button
								className="px-3 py-1 rounded border"
								onClick={() => setOpen(false)}
								disabled={saving}
							>
								Cancel
							</button>
							<button
								className="px-3 py-1 rounded bg-gray-800 text-white disabled:opacity-60"
								onClick={onSave}
								disabled={saving}
							>
								{saving ? "Saving..." : "Save"}
							</button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
