import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

const THEME_OPTIONS = [
	{
		value: "system" as const,
		icon: Monitor,
		label: "System",
		accessibleLabel: "Use system theme",
	},
	{
		value: "dark" as const,
		icon: Moon,
		label: "Dark",
		accessibleLabel: "Use dark theme",
	},
	{
		value: "light" as const,
		icon: Sun,
		label: "Light",
		accessibleLabel: "Use light theme",
	},
] as const;

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<fieldset
			className="flex gap-1 rounded-lg border border-ds-border bg-ds-surface2 p-1"
			aria-label="Color theme"
		>
			{THEME_OPTIONS.map((opt) => (
				<button
					key={opt.value}
					type="button"
					aria-label={opt.accessibleLabel}
					aria-pressed={theme === opt.value}
					title={opt.accessibleLabel}
					onClick={() => setTheme(opt.value)}
					className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-1.5 py-2 text-xs font-medium transition-colors ${
						theme === opt.value
							? "bg-ds-surface text-ds-fg shadow-sm"
							: "text-ds-muted hover:text-ds-fg"
					}`}
				>
					<opt.icon className="w-3 h-3" />
					{opt.label}
				</button>
			))}
		</fieldset>
	);
}
