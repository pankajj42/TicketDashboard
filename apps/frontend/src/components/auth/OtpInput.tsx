import {
	useRef,
	useEffect,
	type KeyboardEvent,
	type ClipboardEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OtpInputProps {
	value: string;
	onChange: (value: string) => void;
	length?: number;
	disabled?: boolean;
	autoFocus?: boolean;
	className?: string;
}

export default function OtpInput({
	value,
	onChange,
	length = 6,
	disabled = false,
	autoFocus = true,
	className,
}: OtpInputProps) {
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	// Initialize refs array
	useEffect(() => {
		inputRefs.current = inputRefs.current.slice(0, length);
	}, [length]);

	// Auto-focus first input on mount
	useEffect(() => {
		if (autoFocus && inputRefs.current[0] && !disabled) {
			inputRefs.current[0].focus();
		}
	}, [autoFocus, disabled]);

	const handleInputChange = (index: number, inputValue: string) => {
		// Only allow digits
		const sanitized = inputValue.replace(/[^0-9]/g, "");

		if (sanitized.length > 1) {
			// Handle paste or multiple characters
			handlePaste(sanitized, index);
			return;
		}

		const newValue = value.split("");
		newValue[index] = sanitized;

		const updatedValue = newValue.join("").slice(0, length);
		onChange(updatedValue);

		// Move to next input if digit was entered
		if (sanitized && index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (
		index: number,
		e: KeyboardEvent<HTMLInputElement>
	) => {
		if (e.key === "Backspace") {
			if (!value[index] && index > 0) {
				// If current input is empty, move to previous and clear it
				const newValue = value.split("");
				newValue[index - 1] = "";
				onChange(newValue.join(""));
				inputRefs.current[index - 1]?.focus();
			} else {
				// Clear current input
				const newValue = value.split("");
				newValue[index] = "";
				onChange(newValue.join(""));
			}
		} else if (e.key === "ArrowLeft" && index > 0) {
			inputRefs.current[index - 1]?.focus();
		} else if (e.key === "ArrowRight" && index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		} else if (e.key === "Delete") {
			const newValue = value.split("");
			newValue[index] = "";
			onChange(newValue.join(""));
		}
	};

	const handlePaste = (pastedValue: string, startIndex: number = 0) => {
		const digits = pastedValue.replace(/[^0-9]/g, "").slice(0, length);
		const newValue = value.split("");

		for (let i = 0; i < digits.length && startIndex + i < length; i++) {
			newValue[startIndex + i] = digits[i];
		}

		onChange(newValue.join(""));

		// Focus the next empty input or the last input
		const nextIndex = Math.min(startIndex + digits.length, length - 1);
		inputRefs.current[nextIndex]?.focus();
	};

	const handlePasteEvent = (
		e: ClipboardEvent<HTMLInputElement>,
		index: number
	) => {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text");
		handlePaste(pastedData, index);
	};

	const handleFocus = (index: number) => {
		// Select the content when focusing
		inputRefs.current[index]?.select();
	};

	return (
		<div className={cn("flex gap-2", className)}>
			{Array.from({ length }, (_, index) => (
				<Input
					key={index}
					ref={(el) => {
						inputRefs.current[index] = el;
					}}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={value[index] || ""}
					onChange={(e) => handleInputChange(index, e.target.value)}
					onKeyDown={(e) => handleKeyDown(index, e)}
					onPaste={(e) => handlePasteEvent(e, index)}
					onFocus={() => handleFocus(index)}
					disabled={disabled}
					className={cn(
						"h-12 w-12 text-center text-lg font-semibold",
						"border-2 rounded-lg",
						"focus:border-primary focus:ring-2 focus:ring-primary/20",
						"disabled:opacity-50 disabled:cursor-not-allowed",
						value[index]
							? "border-primary bg-primary/5"
							: "border-muted-foreground/30"
					)}
					aria-label={`Digit ${index + 1} of ${length}`}
				/>
			))}
		</div>
	);
}
