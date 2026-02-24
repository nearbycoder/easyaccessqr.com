import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/app/settings/teams")({
	component: DeprecatedTeamsPage,
});

function DeprecatedTeamsPage() {
	return (
		<div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:p-6">
			<div className="border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-6 sm:p-8">
				<div className="mb-3 flex items-center gap-2 text-ds-accent">
					<Users className="h-4 w-4" />
					<span className="text-xs font-extrabold tracking-wide">Members</span>
				</div>
				<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
					Teams are no longer used
				</h1>
				<p className="mt-2 text-sm text-ds-muted">
					Easy Access QR now uses organization membership only. Manage access in
					members settings.
				</p>
				<Link
					to="/app/settings/members"
					className="mt-5 inline-flex items-center gap-2 border-2 border-ds-border-strong rounded-2xl px-4 py-2 text-xs font-extrabold tracking-wide transition-colors hover:bg-ds-border-strong hover:text-ds-bg"
				>
					Go to members
				</Link>
			</div>
		</div>
	);
}
