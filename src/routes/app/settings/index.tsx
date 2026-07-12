import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, LockKeyhole, UserRound, Users } from "lucide-react";
import { useTRPC } from "@/integrations/trpc/react";

export const Route = createFileRoute("/app/settings/")({
	component: SettingsIndex,
});

function SettingsIndex() {
	const trpc = useTRPC();
	const { data: org } = useQuery(trpc.org.getDetails.queryOptions());
	const { data: sub } = useQuery(trpc.org.getSubscription.queryOptions());
	const { data: myMembership } = useQuery(
		trpc.org.getMyMembership.queryOptions(),
	);
	const canManageOrganization = myMembership?.canManageOrganization ?? false;
	const planLabel = (sub?.plan ?? "free")
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-8">
				<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
					Settings
				</h1>
				<p className="text-ds-muted text-sm mt-1">
					Manage {org?.name ?? "your organization"}
				</p>
			</div>

			<div className="mb-6 border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-4 sm:p-6">
				<h2 className="text-sm font-bold tracking-wide text-ds-muted mb-6">
					Organization
				</h2>
				<div className="space-y-3">
					<div className="flex flex-col items-start gap-1 border-b border-ds-border py-2 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-ds-muted text-sm">Name</span>
						<span className="font-bold text-sm">{org?.name}</span>
					</div>
					<div className="flex flex-col items-start gap-1 border-b border-ds-border py-2 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-ds-muted text-sm">Slug</span>
						<span className="text-ds-text-secondary text-sm">{org?.slug}</span>
					</div>
					<div className="flex flex-col items-start gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-ds-muted text-sm">Plan</span>
						<span className="text-ds-accent font-extrabold text-sm tracking-wide ">
							{planLabel}
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				<Link
					to="/app/settings/profile"
					className="group h-full min-h-[140px] cursor-pointer rounded-2xl border-2 border-ds-border bg-ds-surface/60 p-6 transition-all hover:border-ds-muted2 hover:bg-ds-surface"
				>
					<UserRound className="mb-3 h-6 w-6 text-ds-accent" />
					<div className="text-sm font-extrabold tracking-wide">Profile</div>
					<div className="mt-1 text-xs text-ds-muted">Public bio</div>
				</Link>
				<Link
					to="/app/settings/members"
					className="group h-full min-h-[140px] cursor-pointer rounded-2xl border-2 border-ds-border bg-ds-surface/60 p-6 transition-all hover:border-ds-muted2 hover:bg-ds-surface"
				>
					<Users className="mb-3 h-6 w-6 text-ds-accent" />
					<div className="text-sm font-extrabold tracking-wide">People</div>
					<div className="mt-1 text-xs text-ds-muted">Members &amp; access</div>
				</Link>
				{canManageOrganization && (
					<Link to="/app/settings/billing">
						<div className="h-full min-h-[140px] border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-6 hover:bg-ds-surface hover:border-ds-muted2 transition-all cursor-pointer group">
							<CreditCard className="w-6 h-6 text-ds-accent mb-3" />
							<div className="font-extrabold text-sm tracking-wide">
								Billing
							</div>
							<div className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-ds-muted text-xs">
								Plan &amp; payment
							</div>
						</div>
					</Link>
				)}
				<Link to="/app/settings/security">
					<div className="h-full min-h-[140px] border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-6 hover:bg-ds-surface hover:border-ds-muted2 transition-all cursor-pointer group">
						<LockKeyhole className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mb-3" />
						<div className="font-extrabold text-sm tracking-wide">Security</div>
						<div className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-ds-muted text-xs">
							Password &amp; sessions
						</div>
					</div>
				</Link>
			</div>
		</div>
	);
}
