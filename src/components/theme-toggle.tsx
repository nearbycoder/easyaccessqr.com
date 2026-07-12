import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

const THEME_OPTIONS = [
	{
		value: "system" as const,
		icon: Monitor,
		label: "Sys",
		accessibleLabel: "Use system theme",
	},
	{
		value: "dark" as const,
		icon: Moon,
		label: "Drk",
		accessibleLabel: "Use dark theme",
	},
	{
		value: "light" as const,
		icon: Sun,
		label: "Lgt",
		accessibleLabel: "Use light theme",
	},
] as const;

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	return (
		<fieldset
			className="flex overflow-hidden rounded-xl border-[2px] border-ds-border"
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
					className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide transition-all duration-100 ${
						theme === opt.value
							? "bg-ds-accent text-ds-accent-fg"
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
