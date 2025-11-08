import { forwardRef } from "react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EmailInputProps {
	value: string;
	onChange: (value: string) => void;
	onEnterKey?: () => void;
	placeholder?: string;
	disabled?: boolean;
	error?: string;
	label?: string;
	showIcon?: boolean;
	className?: string;
	id?: string;
}

const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
	(
		{
			value,
			onChange,
			onEnterKey,
			placeholder = "you@company.com",
			disabled = false,
			error,
			label = "Email",
			showIcon = true,
			className,
			id = "email",
		},
		ref
	) => {
		const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && onEnterKey) {
				e.preventDefault();
				onEnterKey();
			}
		};

		return (
			<div className={cn("space-y-2", className)}>
				{label && (
					<Label htmlFor={id} className="text-sm font-medium">
						{label}
					</Label>
				)}
				<div className="relative">
					{showIcon && (
						<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					)}
					<Input
						ref={ref}
						id={id}
						type="email"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={disabled}
						className={cn(
							showIcon && "pl-10",
							error &&
								"border-destructive focus-visible:ring-destructive",
							"transition-colors"
						)}
						aria-invalid={!!error}
						aria-describedby={error ? `${id}-error` : undefined}
					/>
				</div>
				{error && (
					<p
						id={`${id}-error`}
						className="text-sm text-destructive dark:text-red-400"
					>
						{error}
					</p>
				)}
			</div>
		);
	}
);

EmailInput.displayName = "EmailInput";

export default EmailInput;
