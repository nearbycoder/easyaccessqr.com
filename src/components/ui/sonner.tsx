import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/lib/theme";

const Toaster = ({ ...props }: ToasterProps) => {
	const { resolved } = useTheme();

	return (
		<Sonner
			theme={resolved}
			className="toaster group font-sans"
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			toastOptions={{
				classNames: {
					toast:
						"rounded-xl border border-border bg-card text-card-foreground shadow-lg",
					title: "text-sm font-medium",
					description: "text-xs text-muted-foreground leading-relaxed",
					closeButton:
						"border border-border rounded-md bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
					actionButton:
						"rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90",
					cancelButton:
						"rounded-md border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
					success: "border-l-4 border-l-primary",
					info: "border-l-4 border-l-primary",
					warning: "border-l-4 border-l-foreground",
					error: "border-l-4 border-l-destructive",
					loading: "border-l-4 border-l-muted-foreground",
				},
			}}
			style={
				{
					"--normal-bg": "var(--card)",
					"--normal-text": "var(--card-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "12px",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
