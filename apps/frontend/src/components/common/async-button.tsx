import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonSpinner } from "@/components/common/button-spinner";

type AsyncButtonProps = React.ComponentProps<typeof Button> & {
	onClick: (
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>
	) => Promise<any> | void;
	loadingText?: string;
	icon?: React.ReactNode;
	loading?: boolean; // external override
};

export function AsyncButton({
	onClick,
	loadingText,
	icon,
	loading,
	disabled,
	children,
	...buttonProps
}: AsyncButtonProps) {
	const [internalLoading, setInternalLoading] = useState(false);

	const isBusy = Boolean(loading ?? internalLoading);

	const handleClick = async (
		e: React.MouseEvent<HTMLButtonElement, MouseEvent>
	) => {
		setInternalLoading(true);
		try {
			await Promise.resolve(onClick?.(e));
		} finally {
			setInternalLoading(false);
		}
	};

	return (
		<Button
			onClick={handleClick}
			disabled={disabled || isBusy}
			aria-busy={isBusy}
			{...buttonProps}
		>
			<ButtonSpinner
				loading={isBusy}
				loadingText={loadingText}
				icon={icon}
			>
				{children}
			</ButtonSpinner>
		</Button>
	);
}
