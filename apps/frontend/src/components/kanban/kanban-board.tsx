import { useState } from "react";
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
import { type Column, type CardItem } from "./kanban-utils";
import KanbanColumn from "./kanban-column";
import { createPortal } from "react-dom";

type KanbanBoardProps = {
	columns: Column[];
	setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
};

export default function KanbanBoard({ columns, setColumns }: KanbanBoardProps) {
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

	return (
		<div className="flex-1 p-4 bg-gray-200 dark:bg-gray-900 overflow-y-auto md:overflow-hidden">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				{/* Desktop: Equal width columns, Mobile: Stacked with scroll */}
				<div className="md:grid md:grid-cols-5 md:gap-4 md:items-start flex flex-col gap-4">
					{columns.map((col) => (
						<div key={col.id} className="md:min-w-0">
							{/* We expose the column id as a drop target id (so dropping on empty space works) */}
							<div id={col.id}>
								<KanbanColumn column={col} />
							</div>
						</div>
					))}
				</div>

				{createPortal(
					<DragOverlay>
						{activeCard ? (
							<div className="bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-2xl p-3 shadow-lg opacity-95">
								<div className="font-medium text-gray-900 dark:text-gray-100">
									{activeCard.title}
								</div>
							</div>
						) : null}
					</DragOverlay>,
					document.body
				)}
			</DndContext>
		</div>
	);
}
