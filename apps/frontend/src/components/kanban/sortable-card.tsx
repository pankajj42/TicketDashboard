import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { type CardItem } from "./kanban-utils";

type Props = {
	item: CardItem;
};

export default function SortableCard({ item }: Props) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });
	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.35 : 1,
		border: isDragging ? "2px solid #6b7280" : "1px solid #e6e7eb",
	};

	return (
		<motion.div
			ref={setNodeRef}
			style={style}
			layout
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.98 }}
			className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 mb-3 cursor-grab hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 hover:scale-[1.02] transition-all duration-200 border border-gray-300 dark:border-gray-700"
			{...attributes}
			{...listeners}
		>
			<div className="font-medium text-gray-800 dark:text-gray-100">
				{item.title}
			</div>
			{item.description ? (
				<div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
					{item.description}
				</div>
			) : null}
		</motion.div>
	);
}
