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
					<Label className="text-gray-900 dark:text-gray-200">
						Column
					</Label>
					<select
						className="border rounded px-2 py-1 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200"
						value={newColumnId}
						onChange={(e) => setNewColumnId(e.target.value)}
						onKeyDown={handleKeyDown}
					>
						{columns.map((c) => (
							<option
								key={c.id}
								value={c.id}
								className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
							>
								{c.title}
							</option>
						))}
					</select>
				</div>

				<DialogFooter>
					<Button
						onClick={handleAddCard}
						className="bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
