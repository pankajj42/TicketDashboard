import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { type CardItem } from "./kanban-utils";
import { Loader2 } from "lucide-react";

type Props = {
	item: CardItem;
	onOpen?: (id: string) => void;
	disabled?: boolean;
};

export default function SortableCard({
	item,
	onOpen,
	disabled = false,
}: Props) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id, disabled });
	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: disabled ? 0.5 : isDragging ? 0.35 : 1,
		border: isDragging ? "2px solid #6b7280" : "1px solid #e6e7eb",
		cursor: disabled ? "not-allowed" : "grab",
	};

	return (
		<motion.div
			ref={setNodeRef}
			style={style}
			layout
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.98 }}
			aria-disabled={disabled}
			className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 mb-3 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 hover:scale-[1.02] transition-all duration-200 border border-gray-300 dark:border-gray-700"
			{...attributes}
			{...(disabled ? {} : listeners)}
			onClick={() => (!disabled ? onOpen?.(item.id) : undefined)}
		>
			<div className="font-medium text-gray-800 dark:text-gray-100">
				{item.title}
			</div>
			{item.description ? (
				<div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
					{item.description}
				</div>
			) : null}

			{disabled && (
				<div className="absolute inset-0 bg-white/60 dark:bg-gray-900/40 rounded-2xl grid place-items-center">
					<Loader2 className="h-5 w-5 animate-spin text-gray-700 dark:text-gray-200" />
				</div>
			)}
		</motion.div>
	);
}
