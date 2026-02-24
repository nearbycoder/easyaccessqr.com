import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();

	const options = [
		{ value: "system" as const, icon: Monitor, label: "Sys" },
		{ value: "dark" as const, icon: Moon, label: "Drk" },
		{ value: "light" as const, icon: Sun, label: "Lgt" },
	];

	return (
		<div className="flex overflow-hidden rounded-xl border-[2px] border-ds-border">
			{options.map((opt) => (
				<button
					key={opt.value}
					type="button"
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
		</div>
	);
}
