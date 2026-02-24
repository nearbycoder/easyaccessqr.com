import { useNavigate } from "@tanstack/react-router";
import {
	BarChart3,
	Building2,
	LogOut,
	Monitor,
	Moon,
	QrCode,
	Settings,
	SquareTerminal,
	Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "@/lib/theme";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "./ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

type SessionData = NonNullable<
	ReturnType<typeof authClient.useSession>["data"]
>;

type OrganizationOption = {
	id: string;
	name: string;
	slug: string;
};

type CommandSection = "Navigation" | "Workspace" | "Actions";

type PaletteItem = {
	id: string;
	group: CommandSection;
	label: string;
	description: string;
	keywords: string;
	icon: React.ComponentType<{ className?: string }>;
	action: () => void | Promise<void>;
};

const commandGroupOrder: CommandSection[] = [
	"Navigation",
	"Workspace",
	"Actions",
];

export const APP_COMMAND_MENU_OPEN_EVENT = "easy-access:open-command-menu";

function isMacPlatform() {
	if (typeof navigator === "undefined") return false;
	const platform = navigator.platform || navigator.userAgent;
	return /(Mac|iPhone|iPad|iPod)/i.test(platform);
}

export function AppCommandMenu({
	session,
	organizations,
	onSignOut,
}: {
	session: SessionData;
	organizations: OrganizationOption[];
	onSignOut: () => Promise<void>;
}) {
	const navigate = useNavigate();
	const { setTheme } = useTheme();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [isMacLike, setIsMacLike] = useState(false);
	const activeOrganizationId = session.session.activeOrganizationId ?? "";

	useEffect(() => {
		setIsMacLike(isMacPlatform());
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() !== "k") return;
			if (event.altKey || event.shiftKey) return;
			const expectedModifier = isMacPlatform() ? event.metaKey : event.ctrlKey;
			if (!expectedModifier) return;
			event.preventDefault();
			setOpen(true);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	useEffect(() => {
		const onOpenCommandMenu = () => setOpen(true);
		window.addEventListener(APP_COMMAND_MENU_OPEN_EVENT, onOpenCommandMenu);
		return () =>
			window.removeEventListener(
				APP_COMMAND_MENU_OPEN_EVENT,
				onOpenCommandMenu,
			);
	}, []);

	const items = useMemo<PaletteItem[]>(() => {
		const navigationItems: PaletteItem[] = [
			{
				id: "go-dashboard",
				group: "Navigation",
				label: "Open dashboard",
				description: "/app",
				keywords: "dashboard home",
				icon: SquareTerminal,
				action: () => navigate({ to: "/app" }),
			},
			{
				id: "go-qr-codes",
				group: "Navigation",
				label: "Open QR codes",
				description: "/app/qr-codes",
				keywords: "qr code create edit",
				icon: QrCode,
				action: () => navigate({ to: "/app/qr-codes" }),
			},
			{
				id: "go-analytics",
				group: "Navigation",
				label: "Open analytics",
				description: "/app/analytics",
				keywords: "analytics reports metrics",
				icon: BarChart3,
				action: () => navigate({ to: "/app/analytics" }),
			},
			{
				id: "go-people",
				group: "Navigation",
				label: "Open people",
				description: "/app/settings/members",
				keywords: "people members organization users",
				icon: Building2,
				action: () => navigate({ to: "/app/settings/members" }),
			},
			{
				id: "go-settings",
				group: "Navigation",
				label: "Open settings",
				description: "/app/settings",
				keywords: "settings configuration",
				icon: Settings,
				action: () => navigate({ to: "/app/settings" }),
			},
		];

		const workspaceItems: PaletteItem[] = organizations
			.filter((organization) => organization.id !== activeOrganizationId)
			.map((organization) => ({
				id: `switch-workspace-${organization.id}`,
				group: "Workspace" as const,
				label: `Switch workspace: ${organization.name}`,
				description: organization.slug,
				keywords: `workspace organization ${organization.name} ${organization.slug}`,
				icon: SquareTerminal,
				action: async () => {
					const result = await authClient.organization.setActive({
						organizationId: organization.id,
					});
					if (result?.error) {
						toast.error(result.error.message ?? "Failed to switch workspace");
						return;
					}
					window.location.reload();
				},
			}));

		const actionItems: PaletteItem[] = [
			{
				id: "theme-dark",
				group: "Actions",
				label: "Switch to dark theme",
				description: "Appearance",
				keywords: "theme dark mode appearance",
				icon: Moon,
				action: () => setTheme("dark"),
			},
			{
				id: "theme-light",
				group: "Actions",
				label: "Switch to light theme",
				description: "Appearance",
				keywords: "theme light mode appearance",
				icon: Sun,
				action: () => setTheme("light"),
			},
			{
				id: "theme-system",
				group: "Actions",
				label: "Use system theme",
				description: "Appearance",
				keywords: "theme system appearance",
				icon: Monitor,
				action: () => setTheme("system"),
			},
			{
				id: "sign-out",
				group: "Actions",
				label: "Sign out",
				description: "End current session",
				keywords: "logout sign out",
				icon: LogOut,
				action: () => onSignOut(),
			},
		];

		return [...navigationItems, ...workspaceItems, ...actionItems];
	}, [activeOrganizationId, navigate, onSignOut, organizations, setTheme]);

	const groupedItems = useMemo(
		() =>
			commandGroupOrder
				.map((group) => ({
					group,
					items: items.filter((item) => item.group === group),
				}))
				.filter((entry) => entry.items.length > 0),
		[items],
	);

	const shortcutLabel = isMacLike ? "Cmd+K" : "Ctrl+K";

	const runItem = async (item: PaletteItem) => {
		setOpen(false);
		setQuery("");
		try {
			await item.action();
		} catch {
			toast.error("Command failed");
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[80vh] max-w-xl border border-ds-border bg-ds-surface p-4 font-sans text-ds-fg sm:p-5"
			>
				<DialogHeader className="gap-1 text-left">
					<div className="flex items-center justify-between gap-3">
						<DialogTitle className="text-xl font-semibold tracking-tight">
							Quick actions
						</DialogTitle>
						<span className="rounded-md border border-ds-border bg-ds-surface2 px-2 py-0.5 text-xs font-semibold text-ds-text-tertiary">
							{shortcutLabel}
						</span>
					</div>
					<DialogDescription className="text-sm text-ds-text-secondary">
						Jump anywhere and run actions fast.
					</DialogDescription>
				</DialogHeader>

				<Command
					loop
					value={query}
					onValueChange={setQuery}
					className="rounded-xl border border-ds-border bg-ds-input-bg"
				>
					<CommandInput
						autoFocus
						placeholder="Type a command"
						className="h-12 !rounded-none border-0 bg-transparent text-sm text-ds-fg placeholder:text-ds-text-tertiary"
					/>
					<CommandList className="max-h-[56vh] border-t border-ds-border p-1">
						<CommandEmpty className="px-4 py-8 text-sm text-ds-text-secondary">
							No matching commands.
						</CommandEmpty>

						{groupedItems.map((entry) => (
							<CommandGroup
								key={entry.group}
								heading={entry.group}
								className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ds-text-tertiary"
							>
								{entry.items.map((item) => (
									<CommandItem
										key={item.id}
										value={`${item.label} ${item.description}`}
										keywords={item.keywords.split(" ")}
										onSelect={() => void runItem(item)}
										className="gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-ds-surface2 data-[selected=true]:text-ds-fg"
									>
										<item.icon className="h-4 w-4 shrink-0 text-ds-accent" />
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-semibold text-ds-fg">
												{item.label}
											</div>
											<div className="truncate text-xs text-ds-text-tertiary">
												{item.description}
											</div>
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
