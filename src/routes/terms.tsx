import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { buildPageSeo } from "@/lib/seo";

const termsSeo = buildPageSeo({
	title: "Terms of Service | Easy Access QR",
	description:
		"Review the Easy Access QR terms of service, including plan limits, billing terms, acceptable use, and account responsibilities.",
	path: "/terms",
	ogPage: "terms",
	ogType: "article",
});

export const Route = createFileRoute("/terms")({
	component: TermsPage,
	head: () => ({ meta: termsSeo.meta, links: termsSeo.links }),
});

const sections = [
	{
		id: "acceptance",
		title: "Acceptance",
		paragraphs: [
			"By using Easy Access QR, you agree to these terms of service and the privacy policy.",
			"If you do not agree to these terms, you should not use the service.",
		],
	},
	{
		id: "accounts",
		title: "Accounts and organizations",
		paragraphs: [
			"You are responsible for maintaining account security and for activity performed through your account.",
			"Organization owners and admins are responsible for access management, member roles, and workspace configuration.",
		],
	},
	{
		id: "acceptable-use",
		title: "Acceptable use",
		paragraphs: [
			"You may not use the service for unlawful activity, abusive behavior, unauthorized access attempts, or activity that disrupts platform availability.",
			"You are responsible for destination URLs and linked content associated with your QR codes.",
		],
	},
	{
		id: "billing",
		title: "Plans and billing",
		paragraphs: [
			"Paid plans renew automatically unless canceled before the next billing cycle.",
			"Feature access and usage limits depend on the active subscription plan.",
			"Billing, refunds, and disputes are handled under applicable law and payment processor terms.",
		],
	},
	{
		id: "termination",
		title: "Suspension and termination",
		paragraphs: [
			"We may suspend or terminate access for material violations of these terms or security risks.",
			"You may stop using the service at any time and request account or organization deletion.",
		],
	},
	{
		id: "liability",
		title: "Disclaimers and limitation of liability",
		paragraphs: [
			"The service is provided on an as-is and as-available basis without warranties of uninterrupted operation.",
			"To the extent permitted by law, Easy Access QR is not liable for indirect, incidental, or consequential damages.",
		],
	},
	{
		id: "contact",
		title: "Contact",
		paragraphs: [
			"Questions about these terms can be sent to legal@easyaccessqr.com.",
		],
	},
] as const;

function TermsPage() {
	return (
		<div className="min-h-screen bg-ds-bg text-ds-fg selection:bg-ds-selection-bg selection:text-ds-selection-fg font-sans">
			<MarketingHeader />

			<main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
				<article className="rounded-2xl border border-ds-border bg-ds-surface p-6 sm:p-10">
					<div className="flex items-center gap-2 text-ds-accent">
						<FileText className="h-4 w-4" />
						<span className="text-xs font-semibold tracking-wide">
							Legal document
						</span>
					</div>
					<h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
						Terms of service
					</h1>
					<p className="mt-3 text-sm leading-relaxed text-ds-text-secondary sm:text-base">
						These terms describe your rights and responsibilities when using
						Easy Access QR.
					</p>

					<div className="mt-6 rounded-xl border border-ds-border bg-ds-input-bg p-4 text-sm text-ds-text-secondary">
						<p>
							<span className="font-semibold text-ds-fg">Effective date:</span>{" "}
							February 24, 2026
						</p>
						<p className="mt-1">
							<span className="font-semibold text-ds-fg">Applies to:</span> All
							organizations and users on easyaccessqr.com
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
						<a
							href="mailto:contact@easyaccessqr.com"
							className="hover:text-ds-fg"
						>
							contact@easyaccessqr.com
						</a>
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
