import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useProjectStore } from "@/store/project.store";
import { useAccessToken } from "@/store/auth.store";
import { TicketApiService } from "@/services/ticket.api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateTicket() {
	const [openNew, setOpenNew] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { selectedProjectId } = useProjectStore();
	const token = useAccessToken();

	async function handleAddCard() {
		if (!newTitle.trim() || !selectedProjectId || !token || isSubmitting)
			return;
		try {
			setIsSubmitting(true);
			await TicketApiService.create(
				selectedProjectId,
				{
					title: newTitle.trim(),
					description: description.trim() || "",
				},
				token
			);
			toast.success("Ticket created");
			setNewTitle("");
			setDescription("");
			setOpenNew(false);
			// Notify dashboard to refetch tickets
			window.dispatchEvent(new CustomEvent("tickets:refresh"));
		} catch (e: any) {
			toast.error(e?.message || "Failed to create ticket");
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter") {
			handleAddCard();
		}
	}

	return (
		<Dialog open={openNew} onOpenChange={setOpenNew}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className="bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
				>
					<Plus className="mr-2" size={14} /> New Ticket
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[520px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
				<DialogHeader>
					<DialogTitle className="text-gray-900 dark:text-gray-200">
						Create ticket
					</DialogTitle>
				</DialogHeader>

				<div className="grid gap-2 py-2">
					<Label className="text-gray-900 dark:text-gray-200">
						Title
					</Label>
					<Input
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Card title"
						autoFocus
						className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 placeholder:text-gray-500 dark:placeholder:text-gray-400"
					/>
					<Label className="text-gray-900 dark:text-gray-200 mt-2">
						Description
					</Label>
					<Input
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Short description"
						className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 placeholder:text-gray-500 dark:placeholder:text-gray-400"
					/>
				</div>

				<DialogFooter>
					<Button
						onClick={handleAddCard}
						disabled={isSubmitting}
						aria-busy={isSubmitting}
						className="bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600"
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
