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
					className={cn(
						"h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-card py-2 pl-3 pr-10 text-sm text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
						className,
					)}
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
					<ChevronDown
						aria-hidden="true"
						className={cn("size-4", iconClassName)}
					/>
				</span>
			</div>
		);
	},
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
