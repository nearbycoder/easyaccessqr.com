import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	CirclePlay,
	Download,
	QrCode,
	ScanLine,
	Users,
} from "lucide-react";
import type { Options as QrStyleOptions } from "qr-code-styling/lib/types";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { authClient } from "@/lib/auth-client";
import {
	buildHomeStructuredData,
	buildPageSeo,
	KEYWORD_CLUSTERS,
	SITE_URL,
} from "@/lib/seo";

const homeSeo = buildPageSeo({
	title: "Easy Access QR | QR Platform For Smart Campaigns",
	description:
		"Create dynamic QR codes, track scans, and manage organization campaigns with a clean, modern workspace.",
	path: "/",
	keywords: [
		...KEYWORD_CLUSTERS.core,
		...KEYWORD_CLUSTERS.platform,
		...KEYWORD_CLUSTERS.apiAndAi,
	],
	ogPage: "home",
});

const homeStructuredData = buildHomeStructuredData({ siteUrl: SITE_URL });
const FEATURES_SECTION_ID = "features";
const PRODUCT_SECTION_ID = "product";
const PRICING_SECTION_ID = "pricing";

const features = [
	{
		icon: QrCode,
		title: "Dynamic QR management",
		description:
			"Update destinations instantly without reprinting physical assets.",
	},
	{
		icon: ScanLine,
		title: "Real-time scan analytics",
		description:
			"Monitor volume, activity windows, and top-performing links in one view.",
	},
	{
		icon: Users,
		title: "Organization controls",
		description:
			"Manage member access and keep campaigns scoped to the right workspace.",
	},
	{
		icon: BarChart3,
		title: "Actionable reporting",
		description:
			"Find trends quickly and optimize campaign performance over time.",
	},
] as const;

const billingPlans = [
	{
		name: "Starter",
		price: "$0",
		period: "/month",
		description: "For testing campaigns and small pilots.",
		features: [
			"Up to 3 active QR codes",
			"Basic scan analytics",
			"One organization workspace",
		],
		cta: "Start free",
		highlighted: false,
		comingSoon: false,
	},
	{
		name: "Growth",
		price: "$29",
		period: "/month",
		description: "For teams running active marketing campaigns.",
		features: [
			"Up to 100 active QR codes",
			"Advanced analytics and exports",
			"Member access controls",
		],
		cta: "Choose growth",
		highlighted: true,
		comingSoon: true,
	},
	{
		name: "Scale",
		price: "Custom",
		period: "",
		description: "For high-volume organizations and agencies.",
		features: [
			"Unlimited active QR codes",
			"Priority support",
			"Custom onboarding and SLA",
		],
		cta: "Contact sales",
		highlighted: false,
		comingSoon: true,
	},
] as const;

export const Route = createFileRoute("/")({
	component: LandingPage,
	head: () => ({
		meta: homeSeo.meta,
		links: homeSeo.links,
	}),
});

function LandingPage() {
	const { data: session } = authClient.useSession();
	const [isHydrated, setIsHydrated] = useState(false);
	const [builderOpen, setBuilderOpen] = useState(false);
	const isLoggedIn = isHydrated && Boolean(session?.user);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	return (
		<div className="min-h-screen bg-ds-bg text-ds-fg selection:bg-ds-selection-bg selection:text-ds-selection-fg">
			<script type="application/ld+json">
				{JSON.stringify(homeStructuredData)}
			</script>

			<MarketingHeader
				isHome
				featuresSectionId={FEATURES_SECTION_ID}
				productSectionId={PRODUCT_SECTION_ID}
				pricingSectionId={PRICING_SECTION_ID}
			/>

			<section className="px-4 pt-16 pb-14 sm:px-6 sm:pt-20 sm:pb-18">
				<div className="mx-auto w-full max-w-5xl text-center">
					<h1 className="font-display text-5xl leading-[0.98] text-ds-fg sm:text-7xl">
						QR campaigns,
						<br />
						managed clearly.
					</h1>
					<p className="mx-auto mt-5 max-w-3xl text-lg text-ds-text-secondary sm:text-[30px] sm:leading-normal">
						Run dynamic QR experiences with centralized analytics, clean
						collaboration, and organization-first controls.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Link
							to={isLoggedIn ? "/app" : "/auth/sign-up"}
							search={
								isLoggedIn
									? undefined
									: { invitationId: undefined, email: undefined }
							}
							className="inline-flex items-center gap-2 border border-ds-accent bg-ds-accent px-7 py-3 text-base font-bold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover"
						>
							{isLoggedIn ? "Open dashboard" : "Start free"}
							<ArrowRight className="h-4 w-4" />
						</Link>
						<button
							type="button"
							onClick={() => setBuilderOpen(true)}
							className="inline-flex items-center gap-2 border border-ds-accent bg-transparent px-7 py-3 text-base font-bold text-ds-accent transition-colors hover:bg-ds-surface2"
						>
							<CirclePlay className="h-4 w-4" />
							Check out our QR builder
						</button>
					</div>
				</div>
			</section>

			<section id={PRODUCT_SECTION_ID} className="px-4 pb-12 sm:px-6 sm:pb-16">
				<div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-[1fr_280px]">
					<div className="relative border border-ds-border bg-ds-surface p-4 sm:p-6">
						<div className="mb-4 flex items-center justify-between border-b border-ds-border pb-3">
							<div className="text-xl font-extrabold text-[#de6346]">
								Easy Access QR
							</div>
							<div className="text-sm text-ds-text-tertiary">
								Acme Organization
							</div>
						</div>
						<div className="space-y-3">
							<div className="flex items-center justify-between border border-ds-border bg-ds-surface2 px-4 py-3">
								<div>
									<p className="text-xs font-bold tracking-wide text-ds-text-tertiary">
										Campaign
									</p>
									<p className="text-lg font-bold">Spring launch landing</p>
								</div>
								<div className="text-right">
									<p className="text-xs text-ds-text-tertiary">Scans today</p>
									<p className="text-2xl font-extrabold text-ds-accent">
										1,284
									</p>
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-3">
								<div className="border border-ds-border bg-ds-surface2 p-3">
									<p className="text-xs text-ds-text-tertiary">Total scans</p>
									<p className="mt-1 text-xl font-bold">32,806</p>
								</div>
								<div className="border border-ds-border bg-ds-surface2 p-3">
									<p className="text-xs text-ds-text-tertiary">
										Active QR codes
									</p>
									<p className="mt-1 text-xl font-bold">687</p>
								</div>
								<div className="border border-ds-border bg-ds-surface2 p-3">
									<p className="text-xs text-ds-text-tertiary">Destinations</p>
									<p className="mt-1 text-xl font-bold">104</p>
								</div>
							</div>
						</div>
					</div>
					<div className="space-y-3">
						<div className="border border-ds-border bg-ds-surface2 p-4">
							<p className="text-sm font-bold">QR design studio</p>
							<p className="mt-2 text-sm text-ds-text-secondary">
								Customize dot style, colors, quiet zone, and logos, then
								download production-ready PNG, SVG, or JPEG files.
							</p>
						</div>
						<div className="border border-ds-border bg-ds-surface2 p-4">
							<p className="text-sm font-bold">Dynamic routing analytics</p>
							<p className="mt-2 text-sm text-ds-text-secondary">
								Split traffic across multiple destinations with weighted rules
								and track destination-level views from one short link.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section
				id={FEATURES_SECTION_ID}
				className="border-t border-ds-border px-4 py-12 sm:px-6"
			>
				<div className="mx-auto w-full max-w-6xl">
					<h2 className="text-3xl font-bold tracking-tight">
						Built for focused teams
					</h2>
					<div className="mt-6 grid gap-4 md:grid-cols-2">
						{features.map((feature) => (
							<div
								key={feature.title}
								className="border border-ds-border bg-ds-surface2 p-5"
							>
								<feature.icon className="h-5 w-5 text-ds-accent" />
								<h3 className="mt-3 text-xl font-bold">{feature.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-ds-text-secondary">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section
				id={PRICING_SECTION_ID}
				className="border-t border-ds-border bg-ds-surface px-4 py-12 sm:px-6"
			>
				<div className="mx-auto w-full max-w-6xl">
					<div className="max-w-2xl">
						<h2 className="text-3xl font-bold tracking-tight">
							Billing that scales with usage
						</h2>
						<p className="mt-3 text-base text-ds-text-secondary">
							Start free, upgrade when campaigns grow, and keep billing tied to
							active codes and team size.
						</p>
					</div>
					<div className="mt-4 inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
						Paid plans are coming soon. Starter is available now.
					</div>
					<div className="mt-7 grid gap-4 lg:grid-cols-3">
						{billingPlans.map((plan) => (
							<div
								key={plan.name}
								className={`border p-5 ${
									plan.highlighted
										? "border-ds-accent bg-ds-selection-bg/40"
										: "border-ds-border bg-ds-bg"
								}`}
							>
								<div className="text-sm font-semibold text-ds-text-secondary">
									{plan.name}
								</div>
								{plan.comingSoon ? (
									<div className="mt-2 inline-flex items-center rounded-lg border border-ds-border bg-ds-surface2 px-2 py-1 text-[11px] font-semibold text-ds-text-tertiary">
										Coming soon
									</div>
								) : null}
								<div className="mt-2 flex items-end gap-1">
									<span className="text-3xl font-extrabold tracking-tight">
										{plan.price}
									</span>
									{plan.period ? (
										<span className="pb-1 text-sm text-ds-text-tertiary">
											{plan.period}
										</span>
									) : null}
								</div>
								<p className="mt-2 text-sm text-ds-text-secondary">
									{plan.description}
								</p>
								<ul className="mt-4 space-y-2 text-sm text-ds-text-secondary">
									{plan.features.map((feature) => (
										<li key={feature} className="flex items-start gap-2">
											<span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ds-accent" />
											<span>{feature}</span>
										</li>
									))}
								</ul>
								<div className="mt-5">
									{plan.comingSoon ? (
										<button
											type="button"
											disabled
											className="inline-flex items-center gap-2 border border-ds-border bg-ds-surface2 px-4 py-2 text-sm font-semibold text-ds-text-tertiary opacity-70"
										>
											{plan.cta}
											<ArrowRight className="h-4 w-4" />
										</button>
									) : (
										<Link
											to={isLoggedIn ? "/app" : "/auth/sign-up"}
											search={
												isLoggedIn
													? undefined
													: { invitationId: undefined, email: undefined }
											}
											className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors ${
												plan.highlighted
													? "border-ds-accent bg-ds-accent text-ds-accent-fg hover:bg-ds-accent-hover"
													: "border-ds-border bg-ds-surface hover:bg-ds-surface2"
											}`}
										>
											{plan.cta}
											<ArrowRight className="h-4 w-4" />
										</Link>
									)}
								</div>
							</div>
						))}
					</div>
					<p className="mt-5 text-xs text-ds-text-tertiary">
						Billing is monthly by default. Enterprise plans are invoiced
						annually.
					</p>
				</div>
			</section>

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

			<HomepageQrBuilderModal
				open={builderOpen}
				onOpenChange={setBuilderOpen}
				isLoggedIn={isLoggedIn}
			/>
		</div>
	);
}

type QRCodeStylingInstance = {
	append: (node: HTMLElement) => void;
	download: (options?: {
		name?: string;
		extension?: "png" | "svg" | "jpeg" | "webp";
	}) => Promise<void>;
};

type QRCodeStylingConstructor = new (
	options?: Partial<QrStyleOptions>,
) => QRCodeStylingInstance;
type QrDownloadExtension = "png" | "svg" | "jpeg";

function HomepageQrBuilderModal({
	open,
	onOpenChange,
	isLoggedIn,
}: {
	open: boolean;
	onOpenChange: (nextOpen: boolean) => void;
	isLoggedIn: boolean;
}) {
	const [name, setName] = useState("Spring launch");
	const [destinationUrl, setDestinationUrl] = useState(
		"https://easyaccessqr.com",
	);
	const [dotStyle, setDotStyle] = useState<"rounded" | "square">("rounded");
	const [quietZone, setQuietZone] = useState(8);
	const [previewSize, setPreviewSize] = useState(320);
	const [logoUrl, setLogoUrl] = useState("");
	const [logoSize, setLogoSize] = useState(22);
	const [hideBackgroundDots, setHideBackgroundDots] = useState(true);
	const [dotColor, setDotColor] = useState("#1f2522");
	const [backgroundColor, setBackgroundColor] = useState("#ffffff");
	const [previewData, setPreviewData] = useState("https://easyaccessqr.com");
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [isPreviewReady, setIsPreviewReady] = useState(false);
	const [downloadingExtension, setDownloadingExtension] =
		useState<QrDownloadExtension | null>(null);
	const [qrConstructor, setQrConstructor] =
		useState<QRCodeStylingConstructor | null>(null);
	const qrRef = useRef<QRCodeStylingInstance | null>(null);
	const [previewContainer, setPreviewContainer] =
		useState<HTMLDivElement | null>(null);

	const assignPreviewContainer = useCallback((node: HTMLDivElement | null) => {
		setPreviewContainer(node);
	}, []);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			const module = await import("qr-code-styling");
			if (!mounted) return;
			setQrConstructor(
				() => module.default as unknown as QRCodeStylingConstructor,
			);
		};

		void load();
		return () => {
			mounted = false;
			qrRef.current = null;
			setIsPreviewReady(false);
		};
	}, []);

	useEffect(() => {
		if (!open || !qrConstructor || !previewContainer) return;
		setIsPreviewReady(false);
		const normalizedLogoUrl = logoUrl.trim();
		const validLogoUrl = isHttpUrl(normalizedLogoUrl)
			? normalizedLogoUrl
			: undefined;
		const instance = new qrConstructor({
			type: "svg",
			shape: "square",
			width: previewSize,
			height: previewSize,
			margin: quietZone,
			data: previewData,
			image: validLogoUrl,
			qrOptions: {
				errorCorrectionLevel: "Q",
			},
			imageOptions: {
				hideBackgroundDots,
				imageSize: logoSize / 100,
				margin: 4,
				crossOrigin: "anonymous",
			},
			dotsOptions: {
				type: dotStyle,
				color: dotColor,
			},
			backgroundOptions: {
				color: backgroundColor,
			},
			cornersSquareOptions: {
				type: "extra-rounded",
				color: dotColor,
			},
			cornersDotOptions: {
				type: "dot",
				color: dotColor,
			},
		});
		qrRef.current = instance;
		previewContainer.innerHTML = "";
		instance.append(previewContainer);
		setIsPreviewReady(true);

		return () => {
			if (qrRef.current === instance) {
				qrRef.current = null;
			}
			previewContainer.innerHTML = "";
			setIsPreviewReady(false);
		};
	}, [
		backgroundColor,
		dotColor,
		dotStyle,
		hideBackgroundDots,
		logoSize,
		logoUrl,
		open,
		previewSize,
		previewContainer,
		previewData,
		qrConstructor,
		quietZone,
	]);

	const handleBuildPreview = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isHttpUrl(destinationUrl)) {
			setPreviewError(
				"Enter a valid HTTP(S) destination URL to generate preview.",
			);
			return;
		}
		if (logoUrl.trim() && !isHttpUrl(logoUrl)) {
			setPreviewError("Image URL must be empty or a valid HTTP(S) URL.");
			return;
		}

		setPreviewError(null);
		setPreviewData(destinationUrl.trim());
	};
	const handleDownload = async (extension: QrDownloadExtension) => {
		if (!isPreviewReady || !qrRef.current) {
			toast.error("QR preview is still loading.");
			return;
		}
		setDownloadingExtension(extension);
		try {
			await qrRef.current.download({
				name: sanitizeQrFileName(name),
				extension,
			});
		} catch {
			toast.error("Failed to download QR code.");
		} finally {
			setDownloadingExtension(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto border border-ds-border bg-ds-surface p-5 sm:max-w-5xl">
				<DialogHeader className="text-left">
					<DialogTitle className="text-2xl font-bold tracking-tight">
						QR builder preview
					</DialogTitle>
					<DialogDescription className="text-sm text-ds-text-secondary">
						Build and preview a QR code instantly. This demo does not save
						projects, does not include tracking analytics, and generates a QR
						code that points directly to the destination URL.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
					<form
						onSubmit={handleBuildPreview}
						className="space-y-3 rounded-xl border border-ds-border bg-ds-surface2/30 p-4"
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Name
								</span>
								<input
									value={name}
									onChange={(event) => setName(event.target.value)}
									placeholder="Campaign name"
									autoComplete="off"
									data-1p-ignore="true"
									data-lpignore="true"
									className="h-11 w-full rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
								/>
							</label>
							<div className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Dot style
								</span>
								<NativeSelect
									value={dotStyle}
									onChange={(event) =>
										setDotStyle(
											event.target.value === "square" ? "square" : "rounded",
										)
									}
									className="h-11 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors focus:border-ds-accent"
								>
									<option value="rounded">Rounded</option>
									<option value="square">Square</option>
								</NativeSelect>
							</div>
						</div>

						<label className="block">
							<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
								Destination URL
							</span>
							<input
								required
								type="url"
								value={destinationUrl}
								onChange={(event) => setDestinationUrl(event.target.value)}
								placeholder="https://example.com"
								className="h-11 w-full rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
							/>
						</label>

						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Dot color
								</span>
								<div className="grid grid-cols-[minmax(0,1fr)_48px] gap-2">
									<input
										value={dotColor}
										onChange={(event) => setDotColor(event.target.value)}
										className="h-11 w-full rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none focus:border-ds-accent"
									/>
									<div className="h-11 w-full overflow-hidden rounded-xl border border-ds-border bg-ds-input-bg">
										<input
											type="color"
											value={safeColor(dotColor)}
											onChange={(event) => setDotColor(event.target.value)}
											className="h-full w-full cursor-pointer appearance-none border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0"
										/>
									</div>
								</div>
							</label>
							<label className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Background
								</span>
								<div className="grid grid-cols-[minmax(0,1fr)_48px] gap-2">
									<input
										value={backgroundColor}
										onChange={(event) => setBackgroundColor(event.target.value)}
										className="h-11 w-full rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none focus:border-ds-accent"
									/>
									<div className="h-11 w-full overflow-hidden rounded-xl border border-ds-border bg-ds-input-bg">
										<input
											type="color"
											value={safeColor(backgroundColor)}
											onChange={(event) =>
												setBackgroundColor(event.target.value)
											}
											className="h-full w-full cursor-pointer appearance-none border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:border-0"
										/>
									</div>
								</div>
							</label>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Quiet zone
								</span>
								<input
									type="range"
									min={0}
									max={24}
									step={1}
									value={quietZone}
									onChange={(event) => setQuietZone(Number(event.target.value))}
									className="mt-2 w-full accent-ds-accent"
								/>
								<div className="mt-1 text-xs font-semibold text-ds-fg">
									{quietZone}px
								</div>
							</label>
							<label className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Preview size
								</span>
								<input
									type="range"
									min={220}
									max={440}
									step={10}
									value={previewSize}
									onChange={(event) =>
										setPreviewSize(Number(event.target.value))
									}
									className="mt-2 w-full accent-ds-accent"
								/>
								<div className="mt-1 text-xs font-semibold text-ds-fg">
									{previewSize}px
								</div>
							</label>
						</div>

						<div className="rounded-xl border border-ds-border bg-ds-surface2/45 p-3">
							<label className="block">
								<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
									Center image URL (optional)
								</span>
								<input
									value={logoUrl}
									onChange={(event) => setLogoUrl(event.target.value)}
									placeholder="https://example.com/logo.png"
									autoComplete="off"
									className="h-11 w-full rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
								/>
							</label>
							<div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
								<label className="block">
									<span className="mb-1 block text-xs font-semibold text-ds-text-tertiary">
										Image size
									</span>
									<input
										type="range"
										min={10}
										max={35}
										step={1}
										value={logoSize}
										onChange={(event) =>
											setLogoSize(Number(event.target.value))
										}
										className="mt-2 w-full accent-ds-accent"
									/>
									<div className="mt-1 text-xs font-semibold text-ds-fg">
										{logoSize}%
									</div>
								</label>
								<label className="inline-flex items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 py-2 text-sm text-ds-fg">
									<input
										type="checkbox"
										checked={hideBackgroundDots}
										onChange={(event) =>
											setHideBackgroundDots(event.target.checked)
										}
										className="h-4 w-4 accent-ds-accent"
									/>
									Mask behind image
								</label>
							</div>
						</div>

						{previewError ? (
							<p className="text-xs font-medium text-red-600">{previewError}</p>
						) : (
							<p className="text-xs text-ds-text-tertiary">
								Click create preview to refresh the QR output.
							</p>
						)}

						<div className="flex flex-wrap gap-2">
							<button
								type="submit"
								className="inline-flex h-10 items-center gap-2 rounded-xl border border-ds-accent bg-ds-accent px-4 text-sm font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover"
							>
								<QrCode className="h-4 w-4" />
								Create preview
							</button>
							<button
								type="button"
								onClick={() => {
									setName("Spring launch");
									setDestinationUrl("https://easyaccessqr.com");
									setDotStyle("rounded");
									setQuietZone(8);
									setPreviewSize(320);
									setLogoUrl("");
									setLogoSize(22);
									setHideBackgroundDots(true);
									setDotColor("#1f2522");
									setBackgroundColor("#ffffff");
									setPreviewData("https://easyaccessqr.com");
									setPreviewError(null);
								}}
								className="inline-flex h-10 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-4 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
							>
								Reset
							</button>
						</div>
					</form>

					<div className="rounded-xl border border-ds-border bg-ds-surface2/30 p-4">
						<div className="mb-2 text-xs font-semibold text-ds-text-tertiary">
							Live preview
						</div>
						<div className="rounded-xl border border-ds-border bg-white p-3">
							<div
								ref={assignPreviewContainer}
								className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg [&>canvas]:h-auto [&>canvas]:max-w-full [&>svg]:h-auto [&>svg]:max-w-full"
							/>
						</div>
						<p className="mt-2 text-xs text-ds-text-tertiary">
							Direct destination URL (no tracking):{" "}
							<span className="font-semibold text-ds-fg">{previewData}</span>
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{(["png", "svg", "jpeg"] as const).map((extension) => (
								<button
									key={extension}
									type="button"
									onClick={() => void handleDownload(extension)}
									disabled={!isPreviewReady || downloadingExtension !== null}
									className="inline-flex h-9 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-xs font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
								>
									<Download className="h-3.5 w-3.5" />
									{downloadingExtension === extension
										? "Downloading..."
										: extension.toUpperCase()}
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-2 border-t border-ds-border pt-3">
					<p className="text-xs text-ds-text-tertiary">
						Preview mode only. This demo does not save projects or track views.
						Saved dashboard codes use tracked short links.
					</p>
					<Link
						to={isLoggedIn ? "/app/qr-codes/new" : "/auth/sign-up"}
						search={
							isLoggedIn
								? undefined
								: { invitationId: undefined, email: undefined }
						}
						className="inline-flex items-center gap-2 border border-ds-accent bg-ds-accent px-4 py-2 text-sm font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover"
					>
						{isLoggedIn
							? "Open builder in dashboard"
							: "Create account to save"}
						<ArrowRight className="h-4 w-4" />
					</Link>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function isHttpUrl(value: string) {
	try {
		const parsed = new URL(value.trim());
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function isHexColor(value: string) {
	return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value.trim());
}

function safeColor(value: string) {
	return isHexColor(value) ? value : "#1f2522";
}

function sanitizeQrFileName(value: string) {
	const trimmed = value.trim().toLowerCase();
	const slug = trimmed
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 80);
	return slug || "easy-access-qr-preview";
}
