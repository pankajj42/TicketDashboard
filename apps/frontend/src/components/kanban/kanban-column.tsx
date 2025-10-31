import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type Column } from "./kanban-utils";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import SortableCard from "./sortable-card";
import { useDroppable } from "@dnd-kit/core";

type Props = {
	column: Column;
};

export default function KanbanColumn({ column }: Props) {
	// ✅ make the entire column a droppable region
	const { setNodeRef, isOver } = useDroppable({ id: column.id });

	return (
		<div className="min-w-[300px] md:min-w-0">
			<Card
				className={`flex flex-col rounded-2xl transition-colors max-h-[calc(100vh-100px)] ${
					isOver ? "bg-indigo-50 border-indigo-300 border-2" : ""
				}`}
			>
				<CardHeader className="shrink-0">
					<div className="flex items-center justify-between p-4 pb-0">
						<div>
							<div className="font-semibold">{column.title}</div>
							<div className="text-xs text-muted-foreground">
								{column.items.length} items
							</div>
						</div>
					</div>
				</CardHeader>

				<CardContent
					ref={setNodeRef}
					className="p-4 pt-0 overflow-y-auto min-h-[100px]"
				>
					<SortableContext
						items={column.items.map((i) => i.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-3">
							<AnimatePresence>
								{column.items.map((item) => (
									<SortableCard key={item.id} item={item} />
								))}
							</AnimatePresence>
						</div>
					</SortableContext>

					{column.items.length === 0 && (
						<div className="text-sm text-muted-foreground mt-2">
							Drop cards here
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
