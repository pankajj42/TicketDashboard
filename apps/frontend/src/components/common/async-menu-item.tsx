import * as React from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ButtonSpinner } from "@/components/common/button-spinner";

type AsyncMenuItemProps = React.ComponentProps<typeof DropdownMenuItem> & {
	onSelect: (event: Event | React.SyntheticEvent) => Promise<any> | void;
	loadingText?: string;
	icon?: React.ReactNode;
};

export function AsyncMenuItem({
	onSelect,
	disabled,
	children,
	loadingText = "Working...",
	icon,
	className,
	...rest
}: AsyncMenuItemProps) {
	const [loading, setLoading] = React.useState(false);

	const handleSelect = async (e: Event | React.SyntheticEvent) => {
		if (disabled || loading) return;
		try {
			setLoading(true);
			await Promise.resolve(onSelect?.(e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<DropdownMenuItem
			onSelect={handleSelect}
			disabled={disabled || loading}
			aria-busy={loading}
			className={className}
			{...rest}
		>
			<ButtonSpinner
				loading={loading}
				loadingText={loadingText}
				icon={icon}
			>
				{children}
			</ButtonSpinner>
		</DropdownMenuItem>
	);
}
