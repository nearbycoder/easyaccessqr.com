import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type NativeSelectProps = React.ComponentProps<"select"> & {
	wrapperClassName?: string;
	iconClassName?: string;
	iconWrapperClassName?: string;
};

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
	(
		{
			className,
			wrapperClassName,
			iconClassName,
			iconWrapperClassName,
			children,
			...props
		},
		ref,
	) => {
		return (
			<div className={cn("relative", wrapperClassName)}>
				<select
					ref={ref}
					className={cn("w-full appearance-none pr-10", className)}
					{...props}
				>
					{children}
				</select>
				<span
					className={cn(
						"pointer-events-none absolute inset-y-0 right-3 flex items-center text-ds-text-tertiary",
						iconWrapperClassName,
					)}
				>
					<ChevronDown className={cn("h-4 w-4", iconClassName)} />
				</span>
			</div>
		);
	},
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
