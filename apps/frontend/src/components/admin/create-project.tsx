import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccessToken, useIsAdminElevated } from "@/store/auth.store";
import { ProjectApiService } from "@/services/project.api";
import { ApiError } from "@/services/http";
import { CreateProjectSchema } from "@repo/shared";
import { useProjectStore } from "@/store/project.store";
import { toast } from "sonner";

export default function CreateProjectButton() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const token = useAccessToken();
	const isAdmin = useIsAdminElevated();
	const { loadProjects } = useProjectStore();

	if (!isAdmin) return null;

	async function onCreate() {
		if (!token || isSubmitting) return;
		const parsed = CreateProjectSchema.safeParse({ name, description });
		if (!parsed.success) return; // could show validation
		try {
			setIsSubmitting(true);
			await ProjectApiService.create(parsed.data, token);
			setOpen(false);
			setName("");
			setDescription("");
			await loadProjects();
			toast.success("Project created successfully");
		} catch (e) {
			console.error("Create project failed", e);
			const message =
				e instanceof ApiError ? e.message : "Failed to create project";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="w-full" size="sm">
					Create Project
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Project</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div>
						<Label>Name</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") onCreate();
							}}
						/>
					</div>
					<div>
						<Label>Description</Label>
						<Input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") onCreate();
							}}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={onCreate}
						disabled={isSubmitting}
						aria-busy={isSubmitting}
					>
						{isSubmitting ? (
							<span className="inline-flex items-center">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating...
							</span>
						) : (
							"Create"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
