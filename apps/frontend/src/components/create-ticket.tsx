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
import { type Column } from "./kanban/kanban-utils";

type CreateTicketProps = {
	columns: Column[];
	onAddCard: (title: string, columnId: string) => void;
};

export default function CreateTicket({
	columns,
	onAddCard,
}: CreateTicketProps) {
	const [openNew, setOpenNew] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newColumnId, setNewColumnId] = useState(columns[0]?.id || "");

	function handleAddCard() {
		if (!newTitle.trim()) return;
		onAddCard(newTitle, newColumnId);
		setNewTitle("");
		setOpenNew(false);
	}

	return (
		<Dialog open={openNew} onOpenChange={setOpenNew}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-2" size={14} /> New Ticket
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Create ticket</DialogTitle>
				</DialogHeader>

				<div className="grid gap-2 py-2">
					<Label>Title</Label>
					<Input
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						placeholder="Card title"
					/>
					<Label>Column</Label>
					<select
						className="border rounded px-2 py-1"
						value={newColumnId}
						onChange={(e) => setNewColumnId(e.target.value)}
					>
						{columns.map((c) => (
							<option key={c.id} value={c.id}>
								{c.title}
							</option>
						))}
					</select>
				</div>

				<DialogFooter>
					<Button onClick={handleAddCard}>Create</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
