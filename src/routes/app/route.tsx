import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
} from "@tanstack/react-router";
import {
	BarChart3,
	Bell,
	Building2,
	ChevronDown,
	Gift,
	HelpCircle,
	Home,
	LogOut,
	Menu,
	Plus,
	QrCode,
	Search,
	Settings,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	APP_COMMAND_MENU_OPEN_EVENT,
	AppCommandMenu,
} from "@/components/app-command-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { buildNoIndexMeta } from "@/lib/seo";

export const Route = createFileRoute("/app")({
	component: AppLayout,
	head: () => ({ meta: buildNoIndexMeta() }),
});

function AppLayout() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();
	const [isHydrated, setIsHydrated] = useState(false);
	const shouldRedirectToSignIn = isHydrated && !isPending && !session?.user;

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (!shouldRedirectToSignIn) return;
		void navigate({
			to: "/auth/sign-in",
			search: { invitationId: undefined, email: undefined },
		});
	}, [navigate, shouldRedirectToSignIn]);

	if (!isHydrated || isPending || shouldRedirectToSignIn || !session?.user) {
		return (
			<div className="min-h-screen bg-ds-bg text-ds-fg flex items-center justify-center">
				<span className="text-sm font-semibold text-ds-text-tertiary">
					Loading workspace...
				</span>
			</div>
		);
	}

	if (!session.session.activeOrganizationId) {
		return <OrgSetup />;
	}

	return <AppShell session={session} />;
}

function OrgSetup() {
	const [orgName, setOrgName] = useState("");
	const [orgSlug, setOrgSlug] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const { data: orgs } = authClient.useListOrganizations();
	const organizations = orgs ?? [];
	const hasOrganizations = organizations.length > 0;

	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError("");

		const result = await authClient.organization.create({
			name: orgName,
			slug: orgSlug || orgName.toLowerCase().replace(/\s+/g, "-"),
		});

		if (result.error) {
			setError(result.error.message ?? "Failed to create organization");
			setLoading(false);
			return;
		}

		await authClient.organization.setActive({ organizationId: result.data.id });
		window.location.reload();
	};

	const handleSelect = async (orgId: string) => {
		await authClient.organization.setActive({ organizationId: orgId });
		window.location.reload();
	};

	return (
		<div className="min-h-screen bg-ds-bg px-4 py-8 sm:px-6">
			<div className="mx-auto w-full max-w-xl border border-ds-border bg-ds-surface p-5 sm:p-8">
				<div className="mb-6 text-[28px] font-extrabold tracking-tight text-[#de6346]">
					Easy Access QR
				</div>
				<h1 className="text-3xl font-bold tracking-tight">
					{hasOrganizations ? "Choose organization" : "Create organization"}
				</h1>
				<p className="mt-2 text-sm text-ds-text-secondary">
					Set up your workspace to continue.
				</p>

				{hasOrganizations ? (
					<div className="mt-6 space-y-2">
						{organizations.map((organization) => (
							<button
								key={organization.id}
								type="button"
								onClick={() => void handleSelect(organization.id)}
								className="flex w-full items-center justify-between border border-ds-border bg-white px-3 py-2 text-left text-sm font-semibold text-ds-fg transition-colors hover:bg-ds-surface2"
							>
								<span>{organization.name}</span>
								<span className="text-xs font-medium text-ds-text-tertiary">
									{organization.slug}
								</span>
							</button>
						))}
					</div>
				) : null}

				<form onSubmit={handleCreate} className="mt-6 space-y-3">
					{error ? (
						<div className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
							{error}
						</div>
					) : null}
					<input
						placeholder="Organization name"
						value={orgName}
						onChange={(event) => {
							setOrgName(event.target.value);
							setOrgSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"));
						}}
						required
						className="w-full border border-ds-border bg-white px-3 py-2 text-sm"
					/>
					<input
						placeholder="organization-slug"
						value={orgSlug}
						onChange={(event) => setOrgSlug(event.target.value)}
						required
						className="w-full border border-ds-border bg-white px-3 py-2 text-sm"
					/>
					<button
						type="submit"
						disabled={loading}
						className="inline-flex items-center gap-2 border border-ds-accent bg-ds-accent px-4 py-2 text-sm font-bold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover disabled:opacity-60"
					>
						<Plus className="h-4 w-4" />
						{loading ? "Creating..." : "Create organization"}
					</button>
				</form>
			</div>
		</div>
	);
}

function AppShell({
	session,
}: {
	session: NonNullable<ReturnType<typeof authClient.useSession>["data"]>;
}) {
	const navigate = useNavigate();
	const { data: organizationsData } = authClient.useListOrganizations();
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const [commandShortcutLabel, setCommandShortcutLabel] = useState("Ctrl+K");
	const organizations = organizationsData ?? [];

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/" });
	};

	useEffect(() => {
		if (typeof navigator === "undefined") return;
		const platform = navigator.platform || navigator.userAgent;
		setCommandShortcutLabel(
			/(Mac|iPhone|iPad|iPod)/i.test(platform) ? "Cmd+K" : "Ctrl+K",
		);
	}, []);

	const openCommandMenu = () => {
		window.dispatchEvent(new Event(APP_COMMAND_MENU_OPEN_EVENT));
	};

	return (
		<div className="min-h-screen bg-ds-bg text-ds-fg md:flex md:h-svh md:overflow-hidden">
			<AppCommandMenu
				session={session}
				organizations={organizations}
				onSignOut={handleSignOut}
			/>

			<aside className="hidden w-[240px] shrink-0 border-r border-ds-border bg-ds-surface md:flex md:flex-col md:min-h-0">
				<SidebarContent session={session} organizations={organizations} />
			</aside>

			<div className="flex min-w-0 flex-1 flex-col md:min-h-0">
				<header className="sticky top-0 z-30 border-b border-ds-border bg-ds-surface">
					<div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
						<div className="flex items-center gap-2 md:hidden">
							<button
								type="button"
								onClick={() => setMobileNavOpen(true)}
								className="inline-flex h-9 w-9 items-center justify-center border border-ds-border bg-white text-ds-text-secondary"
							>
								<Menu className="h-4 w-4" />
							</button>
							<div className="text-lg font-extrabold tracking-tight text-[#de6346] sm:text-xl">
								Easy Access QR
							</div>
						</div>

						<div className="hidden flex-1 items-center gap-3 md:flex">
							<button
								type="button"
								onClick={openCommandMenu}
								className="flex h-10 w-full max-w-sm items-center justify-between rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-text-tertiary transition-colors hover:border-ds-accent hover:text-ds-fg"
							>
								<span className="inline-flex items-center gap-2">
									<Search className="h-4 w-4" />
									<span>Quick commands</span>
								</span>
								<span className="rounded-md border border-ds-border bg-ds-surface px-2 py-0.5 text-xs font-semibold text-ds-text-tertiary">
									{commandShortcutLabel}
								</span>
							</button>
						</div>

						<div className="flex items-center gap-1 sm:gap-2">
							<HeaderIcon icon={Gift} className="hidden sm:inline-flex" />
							<HeaderIcon icon={HelpCircle} className="hidden sm:inline-flex" />
							<HeaderIcon icon={Bell} />
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="inline-flex items-center gap-2 border border-ds-border bg-white px-2 py-1.5 text-left sm:gap-3 sm:px-3"
									>
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-ds-surface2 text-xs font-extrabold text-ds-accent">
											{session.user.name?.charAt(0) ?? "U"}
										</div>
										<div className="min-w-0 hidden sm:block">
											<div className="truncate text-sm font-semibold">
												{session.user.name}
											</div>
											<div className="truncate text-xs text-ds-text-tertiary">
												{session.user.email}
											</div>
										</div>
										<ChevronDown className="h-4 w-4 text-ds-text-tertiary" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="end"
									className="w-52 border border-ds-border bg-ds-surface p-1"
								>
									<DropdownMenuItem
										onSelect={() => {
											void handleSignOut();
										}}
										className="cursor-pointer text-red-600"
									>
										<LogOut className="h-4 w-4" />
										Sign out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</header>

				<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
					<SheetContent
						side="left"
						showCloseButton={false}
						className="w-[90vw] max-w-xs border-r border-ds-border bg-ds-surface p-0 text-ds-fg"
					>
						<SheetHeader className="sr-only">
							<SheetTitle>Navigation</SheetTitle>
							<SheetDescription>Primary app navigation</SheetDescription>
						</SheetHeader>
						<SidebarContent
							session={session}
							organizations={organizations}
							onNavigate={() => setMobileNavOpen(false)}
						/>
					</SheetContent>
				</Sheet>

				<main className="min-h-0 min-w-0 flex-1 overflow-auto p-4 sm:p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}

function HeaderIcon({
	icon: Icon,
	className,
}: {
	icon: React.ComponentType<{ className?: string }>;
	className?: string;
}) {
	return (
		<button
			type="button"
			className={`inline-flex h-9 w-9 items-center justify-center border border-transparent text-ds-text-tertiary transition-colors hover:border-ds-border hover:bg-ds-surface2 ${className ?? ""}`}
		>
			<Icon className="h-4 w-4" />
		</button>
	);
}

function SidebarContent({
	session,
	organizations,
	onNavigate,
}: {
	session: NonNullable<ReturnType<typeof authClient.useSession>["data"]>;
	organizations: {
		id: string;
		name: string;
		slug: string;
	}[];
	onNavigate?: () => void;
}) {
	const activeOrganizationId = session.session.activeOrganizationId ?? "";
	const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
	const [workspaceError, setWorkspaceError] = useState("");
	const [createOrgOpen, setCreateOrgOpen] = useState(false);
	const [newOrgName, setNewOrgName] = useState("");
	const [newOrgSlug, setNewOrgSlug] = useState("");
	const [createOrgError, setCreateOrgError] = useState("");
	const [creatingOrg, setCreatingOrg] = useState(false);

	const activeOrganization = useMemo(
		() =>
			organizations.find(
				(organization) => organization.id === activeOrganizationId,
			) ?? null,
		[organizations, activeOrganizationId],
	);

	const switchOrganization = async (organizationId: string) => {
		if (!organizationId || organizationId === activeOrganizationId) return;
		setWorkspaceError("");
		setSwitchingOrgId(organizationId);
		const result = await authClient.organization.setActive({ organizationId });
		if (result?.error) {
			setWorkspaceError(
				result.error.message ?? "Failed to switch organization.",
			);
			setSwitchingOrgId(null);
			return;
		}
		onNavigate?.();
		window.location.reload();
	};

	const createOrganization = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!newOrgName.trim()) return;
		setCreateOrgError("");
		setCreatingOrg(true);
		const result = await authClient.organization.create({
			name: newOrgName.trim(),
			slug: (newOrgSlug.trim() || newOrgName.trim())
				.toLowerCase()
				.replace(/\s+/g, "-"),
		});
		if (result.error) {
			setCreateOrgError(
				result.error.message ?? "Failed to create organization.",
			);
			setCreatingOrg(false);
			return;
		}
		const activateResult = await authClient.organization.setActive({
			organizationId: result.data.id,
		});
		if (activateResult?.error) {
			setCreateOrgError(
				activateResult.error.message ?? "Failed to activate organization.",
			);
			setCreatingOrg(false);
			return;
		}
		onNavigate?.();
		window.location.reload();
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-b border-ds-border px-4 py-4">
				<div className="text-[24px] font-extrabold leading-none tracking-tight whitespace-nowrap text-[#de6346]">
					Easy Access QR
				</div>
			</div>

			<div className="border-b border-ds-border px-3 py-3">
				<div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-ds-text-tertiary">
					Organization
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							disabled={switchingOrgId !== null || creatingOrg}
							className="flex w-full items-center justify-between gap-2 border border-ds-border bg-white px-2.5 py-2 text-left text-sm font-semibold"
						>
							<div className="flex min-w-0 items-center gap-2">
								<Building2 className="h-4 w-4 shrink-0 text-ds-text-tertiary" />
								<span className="truncate">
									{activeOrganization?.name ?? "Current organization"}
								</span>
							</div>
							<ChevronDown className="h-4 w-4 shrink-0 text-ds-text-tertiary" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-[230px] border border-ds-border bg-ds-surface p-1"
					>
						{organizations.map((organization) => (
							<DropdownMenuItem
								key={organization.id}
								disabled={
									switchingOrgId !== null ||
									creatingOrg ||
									organization.id === activeOrganizationId
								}
								onSelect={() => void switchOrganization(organization.id)}
								className="cursor-pointer"
							>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm font-semibold">
										{organization.name}
									</div>
									<div className="truncate text-[11px] text-ds-text-tertiary">
										{organization.slug}
									</div>
								</div>
								{organization.id === activeOrganizationId ? (
									<span className="text-xs font-bold text-ds-accent">
										Active
									</span>
								) : null}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator className="my-1 bg-ds-border" />
						<DropdownMenuItem
							onSelect={() => {
								setCreateOrgError("");
								setNewOrgName("");
								setNewOrgSlug("");
								setCreateOrgOpen(true);
							}}
							className="cursor-pointer font-semibold text-ds-accent"
						>
							<Plus className="h-4 w-4" />
							Create organization
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				{workspaceError ? (
					<p className="mt-2 text-xs font-medium text-red-600">
						{workspaceError}
					</p>
				) : null}
			</div>

			<nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
				<NavLink
					to="/app"
					icon={Home}
					label="Home"
					exact
					onNavigate={onNavigate}
				/>
				<NavLink
					to="/app/qr-codes"
					icon={QrCode}
					label="QR codes"
					onNavigate={onNavigate}
				/>
				<NavLink
					to="/app/analytics"
					icon={BarChart3}
					label="Analytics"
					onNavigate={onNavigate}
				/>
				<NavLink
					to="/app/settings/members"
					icon={Building2}
					label="People"
					onNavigate={onNavigate}
				/>
				<NavLink
					to="/app/settings"
					icon={Settings}
					label="Settings"
					exact
					onNavigate={onNavigate}
				/>
			</nav>

			<div className="border-t border-ds-border px-3 py-3">
				<ThemeToggle />
			</div>

			<Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
				<DialogContent className="border border-ds-border bg-ds-surface p-5 sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-lg font-bold">
							Create organization
						</DialogTitle>
						<DialogDescription className="text-sm text-ds-text-tertiary">
							Start a separate workspace with independent members and billing.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={createOrganization} className="space-y-3">
						<input
							value={newOrgName}
							onChange={(event) => {
								setNewOrgName(event.target.value);
								setNewOrgSlug(
									event.target.value.toLowerCase().replace(/\s+/g, "-"),
								);
							}}
							placeholder="Organization name"
							required
							className="w-full border border-ds-border bg-white px-3 py-2 text-sm"
						/>
						<input
							value={newOrgSlug}
							onChange={(event) => setNewOrgSlug(event.target.value)}
							placeholder="organization-slug"
							required
							className="w-full border border-ds-border bg-white px-3 py-2 text-sm"
						/>
						{createOrgError ? (
							<p className="text-xs text-red-600">{createOrgError}</p>
						) : null}
						<div className="flex items-center justify-end gap-2">
							<button
								type="button"
								onClick={() => setCreateOrgOpen(false)}
								disabled={creatingOrg}
								className="border border-ds-border bg-white px-3 py-1.5 text-xs font-semibold"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={creatingOrg}
								className="border border-ds-accent bg-ds-accent px-3 py-1.5 text-xs font-semibold text-ds-accent-fg"
							>
								{creatingOrg ? "Creating..." : "Create"}
							</button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

type StaticNavTarget =
	| "/app"
	| "/app/analytics"
	| "/app/qr-codes"
	| "/app/settings"
	| "/app/settings/members";

function NavLink({
	to,
	icon: Icon,
	label,
	exact,
	onNavigate,
}: {
	to: StaticNavTarget;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	exact?: boolean;
	onNavigate?: () => void;
}) {
	return (
		<Link
			to={to}
			onClick={onNavigate}
			activeOptions={{ exact }}
			className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-ds-text-secondary transition-colors hover:bg-ds-surface2 hover:text-ds-fg"
			activeProps={{
				className:
					"flex items-center gap-2.5 border border-ds-border bg-ds-surface2 px-3 py-2 text-sm font-semibold !text-ds-accent",
			}}
		>
			<Icon className="h-4 w-4" />
			{label}
		</Link>
	);
}
