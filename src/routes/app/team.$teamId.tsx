import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/app/team/$teamId")({
	component: DeprecatedTeamPage,
});

function DeprecatedTeamPage() {
	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="border-2 border-ds-border rounded-2xl bg-ds-surface/60 p-6 sm:p-8">
				<div className="mb-3 flex items-center gap-2 text-ds-accent">
					<QrCode className="h-4 w-4" />
					<span className="text-xs font-extrabold tracking-wide">QR codes</span>
				</div>
				<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
					Team pages have been removed
				</h1>
				<p className="mt-2 text-sm text-ds-muted">
					This app now scopes access by organization members only.
				</p>
				<div className="mt-5 flex flex-wrap gap-2">
					<Link
						to="/app"
						className="inline-flex items-center gap-2 border-2 border-ds-border-strong rounded-2xl px-4 py-2 text-xs font-extrabold tracking-wide transition-colors hover:bg-ds-border-strong hover:text-ds-bg"
					>
						Back to dashboard
					</Link>
					<Link
						to="/app/settings/members"
						className="inline-flex items-center gap-2 border-2 border-ds-border-strong rounded-2xl px-4 py-2 text-xs font-extrabold tracking-wide transition-colors hover:bg-ds-border-strong hover:text-ds-bg"
					>
						Manage members
					</Link>
				</div>
			</div>
		</div>
	);
}
