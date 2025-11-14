import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { type CardItem } from "./kanban-utils";
import { Loader2, Maximize2 } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

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
		cursor: disabled ? "not-allowed" : "pointer",
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
			className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 mb-3 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750 hover:scale-[1.02] transition-all duration-200 border border-gray-300 dark:border-gray-700"
			// Drag attributes/listeners are moved to the dedicated handle
			onClick={() => (!disabled ? onOpen?.(item.id) : undefined)}
		>
			{/* Title bar becomes the drag handle */}
			<div className="pr-8">
				<Tooltip>
					<TooltipTrigger asChild>
						<div
							role="button"
							aria-label="Drag ticket"
							title="Drag"
							className="inline-flex items-center cursor-grab select-none rounded px-1 py-0.5 hover:bg-gray-200/70 dark:hover:bg-gray-700"
							onPointerDown={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
							onTouchStart={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
							{...(disabled ? {} : attributes)}
							{...(disabled ? {} : listeners)}
						>
							<div className="font-medium text-gray-800 dark:text-gray-100">
								{item.title}
							</div>
						</div>
					</TooltipTrigger>
					<TooltipContent sideOffset={6}>Drag</TooltipContent>
				</Tooltip>
			</div>
			{!disabled && (
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								title="Open details"
								aria-label="Open ticket details"
								aria-haspopup="dialog"
								className="p-1 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-600"
								onPointerDown={(e) => {
									e.stopPropagation();
								}}
								onMouseDown={(e) => {
									e.stopPropagation();
								}}
								onTouchStart={(e) => {
									e.stopPropagation();
								}}
								onClick={(e) => {
									e.stopPropagation();
									onOpen?.(item.id);
								}}
							>
								<Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
							</button>
						</TooltipTrigger>
						<TooltipContent sideOffset={6}>
							Open details
						</TooltipContent>
					</Tooltip>
				</div>
			)}
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
