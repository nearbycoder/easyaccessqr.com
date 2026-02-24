import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildPageSeo } from "@/lib/seo";

const privacySeo = buildPageSeo({
	title: "Privacy Policy | Easy Access QR",
	description:
		"Read the Easy Access QR privacy policy covering data collection, security controls, retention, and user privacy options.",
	path: "/privacy",
	ogPage: "privacy",
	ogType: "article",
});

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () => ({ meta: privacySeo.meta, links: privacySeo.links }),
});

const sections = [
	{
		id: "information-collected",
		title: "Information we collect",
		paragraphs: [
			"We collect account details such as name and email, plus organization membership and role information.",
			"We also collect QR code metadata, scan activity events, and operational telemetry required to run and secure the platform.",
		],
	},
	{
		id: "data-use",
		title: "How we use data",
		paragraphs: [
			"We use data to provide authentication, billing, QR management, analytics, collaboration, and abuse prevention.",
			"We do not sell your personal data.",
		],
	},
	{
		id: "data-sharing",
		title: "Data sharing",
		paragraphs: [
			"We share data with service providers required to operate the platform, including hosting, authentication, and payments providers.",
			"These providers process data under contractual and security requirements.",
		],
	},
	{
		id: "retention",
		title: "Data retention",
		paragraphs: [
			"Data retention follows subscription limits, legal requirements, and account lifecycle state.",
			"Deleted organizations and accounts are removed from active systems, then from backups on a rolling schedule.",
		],
	},
	{
		id: "security",
		title: "Security",
		paragraphs: [
			"We use role-based access controls, encryption in transit, and least-privilege service configuration.",
			"No transmission or storage method is fully risk-free, but security controls are continuously reviewed and updated.",
		],
	},
	{
		id: "your-choices",
		title: "Your choices",
		paragraphs: [
			"You can manage organization members, rotate or revoke API keys, and request deletion of your account.",
			"For privacy requests, contact privacy@easyaccessqr.com.",
		],
	},
] as const;

function PrivacyPage() {
	return (
		<div className="min-h-screen bg-ds-bg text-ds-fg selection:bg-ds-selection-bg selection:text-ds-selection-fg font-sans">
			<header className="border-b border-ds-border bg-ds-surface">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 sm:py-8">
					<div className="text-2xl font-extrabold tracking-tight text-[#de6346] sm:text-4xl">
						Easy Access QR
					</div>
					<div className="ml-auto flex items-center gap-3">
						<ThemeToggle />
						<Link
							to="/"
							className="inline-flex items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 py-2 text-xs font-semibold transition-colors hover:border-ds-accent hover:text-ds-accent sm:px-4"
						>
							<ArrowLeft className="h-4 w-4" />
							Back Home
						</Link>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
				<article className="rounded-2xl border border-ds-border bg-ds-surface p-6 sm:p-10">
					<div className="flex items-center gap-2 text-ds-accent">
						<Shield className="h-4 w-4" />
						<span className="text-xs font-semibold tracking-wide">
							Legal document
						</span>
					</div>
					<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
						Privacy policy
					</h1>
					<p className="mt-3 text-sm leading-relaxed text-ds-text-secondary sm:text-base">
						This policy explains what information we collect, why we collect it,
						and how we handle it.
					</p>

					<div className="mt-6 rounded-xl border border-ds-border bg-ds-input-bg p-4 text-sm text-ds-text-secondary">
						<p>
							<span className="font-semibold text-ds-fg">Effective date:</span>{" "}
							February 24, 2026
						</p>
						<p className="mt-1">
							<span className="font-semibold text-ds-fg">Contact:</span>{" "}
							privacy@easyaccessqr.com
						</p>
					</div>

					<div className="mt-8 space-y-8">
						{sections.map((section, index) => (
							<section
								key={section.id}
								id={section.id}
								className="border-t border-ds-border pt-6 first:border-t-0 first:pt-0"
							>
								<h2 className="text-xl font-semibold tracking-tight">
									{index + 1}. {section.title}
								</h2>
								{section.paragraphs.map((paragraph) => (
									<p
										key={paragraph}
										className="mt-3 text-sm leading-7 text-ds-text-secondary sm:text-base"
									>
										{paragraph}
									</p>
								))}
							</section>
						))}
					</div>
				</article>
			</main>

			<footer className="border-t border-ds-border px-4 py-6 sm:px-6">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-ds-text-tertiary sm:flex-row sm:items-center sm:justify-between">
					<div>Easy Access QR</div>
					<div className="flex items-center gap-4">
						<Link to="/terms" className="hover:text-ds-fg">
							Terms of service
						</Link>
						<Link to="/privacy" className="hover:text-ds-fg">
							Privacy policy
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
