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
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
	DragOverlay,
} from "@dnd-kit/core";
import { DEFAULT_BOARD, type Column, type CardItem, uid } from "./kanban-utils";
import KanbanColumn from "./kanban-column";
import { createPortal } from "react-dom";

export default function KanbanBoard() {
	const [columns, setColumns] = useState<Column[]>(DEFAULT_BOARD);
	const [openNew, setOpenNew] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newColumnId, setNewColumnId] = useState(columns[0].id);
	const [activeCard, setActiveCard] = useState<CardItem | null>(null);

	const sensors = useSensors(useSensor(PointerSensor));

	function handleDragStart(event: DragStartEvent) {
		const { active } = event;
		for (const col of columns) {
			const card = col.items.find((it) => it.id === active.id);
			if (card) {
				setActiveCard(card);
				break;
			}
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveCard(null);

		if (!over) return;
		if (active.id === over.id) return;

		setColumns((prev) => {
			const next = JSON.parse(JSON.stringify(prev)) as Column[];
			let sourceColIdx = -1,
				destColIdx = -1,
				sourceItemIdx = -1,
				destItemIdx = -1;

			next.forEach((col, cidx) => {
				col.items.forEach((it, iidx) => {
					if (it.id === active.id) {
						sourceColIdx = cidx;
						sourceItemIdx = iidx;
					}
					if (it.id === over.id) {
						destColIdx = cidx;
						destItemIdx = iidx;
					}
				});
			});

			// If dropped onto a column container (no card), detect column by id
			if (destColIdx === -1) {
				const maybeCol = next.findIndex(
					(c) => c.id === (over.id as string)
				);
				if (maybeCol !== -1) {
					destColIdx = maybeCol;
					destItemIdx = next[destColIdx].items.length;
				}
			}

			if (sourceColIdx === -1 || destColIdx === -1) return next;
			const [moved] = next[sourceColIdx].items.splice(sourceItemIdx, 1);
			next[destColIdx].items.splice(destItemIdx, 0, moved);
			return next;
		});
	}

	function addCard() {
		if (!newTitle.trim()) return;
		setColumns((prev) =>
			prev.map((c) =>
				c.id === newColumnId
					? {
							...c,
							items: [
								{ id: uid("c"), title: newTitle },
								...c.items,
							],
						}
					: c
			)
		);
		setNewTitle("");
		setOpenNew(false);
	}

	return (
		<div className="h-screen w-full bg-slate-50 flex flex-col">
			<div className="shrink-0 p-4 border-b bg-white">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Project Board</h1>
					</div>

					<div className="flex items-center gap-3">
						<Dialog open={openNew} onOpenChange={setOpenNew}>
							<DialogTrigger asChild>
								<Button>
									<Plus className="mr-2" size={14} /> New
									Ticket
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
										onChange={(e) =>
											setNewTitle(e.target.value)
										}
										placeholder="Card title"
									/>
									<Label>Column</Label>
									<select
										className="border rounded px-2 py-1"
										value={newColumnId}
										onChange={(e) =>
											setNewColumnId(e.target.value)
										}
									>
										{columns.map((c) => (
											<option key={c.id} value={c.id}>
												{c.title}
											</option>
										))}
									</select>
								</div>

								<DialogFooter>
									<Button onClick={addCard}>Create</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</div>

			<div className="flex-1 p-4 overflow-hidden">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					{/* Desktop: Equal width columns, Mobile: Stacked */}
					<div className="h-full md:grid md:grid-cols-5 md:gap-4 flex flex-col gap-4 md:overflow-hidden">
						{columns.map((col) => (
							<div
								key={col.id}
								className="shrink-0 md:shrink md:min-w-0"
							>
								{/* We expose the column id as a drop target id (so dropping on empty space works) */}
								<div id={col.id} className="h-full">
									<KanbanColumn column={col} />
								</div>
							</div>
						))}
					</div>

					{createPortal(
						<DragOverlay>
							{activeCard ? (
								<div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-3 shadow-lg opacity-95">
									<div className="font-medium">
										{activeCard.title}
									</div>
								</div>
							) : null}
						</DragOverlay>,
						document.body
					)}
				</DndContext>
			</div>
		</div>
	);
}
