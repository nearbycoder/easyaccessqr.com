import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	CheckCircle2,
	Circle,
	ExternalLink,
	QrCode,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useState } from "react";
import { useTRPC } from "@/integrations/trpc/react";
import { authClient } from "@/lib/auth-client";
import { buildQrShortPath } from "@/lib/qr-links";

export const Route = createFileRoute("/app/")({
	component: DashboardHome,
});

const ANALYTICS_RANGE_DAYS = 30;
const RECENT_CODES_LIMIT = 6;
const MINI_CHART_BOTTOM = 30;
const MINI_CHART_HEIGHT = 26;

type DashboardTarget =
	| "/app/qr-codes/new"
	| "/app/qr-codes"
	| "/app/analytics"
	| "/app/settings/members";

type OnboardingStep = {
	id: string;
	title: string;
	description: string;
	done: boolean;
	required: boolean;
	actionTo: DashboardTarget;
	actionLabel: string;
};

function DashboardHome() {
	const trpc = useTRPC();
	const { data: session } = authClient.useSession();
	const { data: organizationsData } = authClient.useListOrganizations();

	const qrCodesQuery = useQuery(
		trpc.qrCodes.list.queryOptions({ includeInactive: true }),
	);
	const analyticsQuery = useQuery(
		trpc.qrCodes.getAnalytics.queryOptions({ rangeDays: ANALYTICS_RANGE_DAYS }),
	);
	const membersQuery = useQuery(trpc.org.listMembers.queryOptions());

	const qrCodes = qrCodesQuery.data ?? [];
	const analytics = analyticsQuery.data ?? {
		period: { startDate: "", endDate: "" },
		range: {
			requestedDays: ANALYTICS_RANGE_DAYS,
			appliedDays: ANALYTICS_RANGE_DAYS,
		},
		totals: {
			qrCodes: 0,
			activeQrCodes: 0,
			totalScans: 0,
			scansToday: 0,
		},
		dailyScans: [] as Array<{
			date: string;
			scans: number;
			uniqueQrCodes: number;
		}>,
		topCodes: [] as Array<{
			id: number;
			name: string;
			slug: string;
			destinationUrl: string;
			destinationCount: number;
			isActive: boolean;
			scanCount: number;
			lastScannedAt: Date | null;
			scansInRange: number;
			unattributedViewsInRange: number;
			destinationHits: Array<{
				id: string;
				label: string;
				url: string;
				weight: number;
				viewsInRange: number;
				isConfigured: boolean;
			}>;
		}>,
	};
	const appliedAnalyticsRangeDays =
		analytics.range?.appliedDays ?? ANALYTICS_RANGE_DAYS;
	const teamMembers = membersQuery.data?.length ?? 1;

	const totalCodes = qrCodes.length;
	const activeCodes = qrCodes.filter((code) => code.isActive).length;
	const totalViews = analytics.totals.totalScans;
	const viewsToday = analytics.totals.scansToday;
	const activeOrganizationSlug = useMemo(() => {
		const activeOrganizationId = session?.session.activeOrganizationId ?? "";
		if (!activeOrganizationId) return "";
		return (
			organizationsData?.find(
				(organization) => organization.id === activeOrganizationId,
			)?.slug ?? ""
		);
	}, [organizationsData, session?.session.activeOrganizationId]);

	const onboardingSteps = useMemo<OnboardingStep[]>(
		() => [
			{
				id: "create-qr",
				title: "Create your first QR code",
				description: "Set a destination and save your first managed link.",
				done: totalCodes > 0,
				required: true,
				actionTo: "/app/qr-codes/new",
				actionLabel: totalCodes > 0 ? "Create another code" : "Create QR code",
			},
			{
				id: "activate-qr",
				title: "Publish an active link",
				description: "Keep at least one code active so traffic can be routed.",
				done: activeCodes > 0,
				required: true,
				actionTo: "/app/qr-codes",
				actionLabel: activeCodes > 0 ? "Manage codes" : "Activate a code",
			},
			{
				id: "verify-analytics",
				title: "Capture your first view",
				description: "Open a tracked short link and confirm analytics updates.",
				done: totalViews > 0,
				required: true,
				actionTo: "/app/analytics",
				actionLabel: totalViews > 0 ? "View analytics" : "Open analytics",
			},
			{
				id: "invite-members",
				title: "Invite people",
				description: "Add teammates to collaborate on campaigns and reporting.",
				done: teamMembers > 1,
				required: false,
				actionTo: "/app/settings/members",
				actionLabel: teamMembers > 1 ? "Manage people" : "Invite people",
			},
		],
		[activeCodes, teamMembers, totalCodes, totalViews],
	);

	const requiredSteps = onboardingSteps.filter((step) => step.required);
	const completedRequiredSteps = requiredSteps.filter(
		(step) => step.done,
	).length;
	const onboardingProgress = requiredSteps.length
		? Math.round((completedRequiredSteps / requiredSteps.length) * 100)
		: 100;
	const onboardingComplete = completedRequiredSteps === requiredSteps.length;

	const isLoading =
		qrCodesQuery.isLoading ||
		analyticsQuery.isLoading ||
		membersQuery.isLoading;

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	if (!onboardingComplete) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				{analyticsQuery.isError ? <AnalyticsNotice /> : null}
				<section className="rounded-2xl border border-ds-border bg-ds-surface p-5 sm:p-6">
					<h1 className="text-3xl font-bold tracking-tight">
						Welcome to Easy Access QR
					</h1>
					<p className="mt-1 text-sm text-ds-text-secondary sm:text-base">
						Complete onboarding to unlock your compact dashboard with live
						performance snapshots.
					</p>

					<div className="mt-5">
						<div className="mb-2 flex items-center justify-between gap-3 text-sm">
							<span className="font-semibold text-ds-fg">
								Onboarding progress
							</span>
							<span className="font-semibold text-ds-accent">
								{completedRequiredSteps}/{requiredSteps.length} required steps
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-ds-surface2">
							<div
								className="h-full bg-ds-accent transition-all duration-300"
								style={{ width: `${onboardingProgress}%` }}
							/>
						</div>
					</div>
				</section>

				<div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
					<section className="rounded-2xl border border-ds-border bg-ds-surface p-4 sm:p-5">
						<h2 className="text-xl font-semibold tracking-tight">
							Setup checklist
						</h2>
						<div className="mt-4 space-y-3">
							{onboardingSteps.map((step, index) => (
								<OnboardingStepCard
									key={step.id}
									step={step}
									index={index + 1}
								/>
							))}
						</div>
					</section>

					<section className="rounded-2xl border border-ds-border bg-ds-surface p-4 sm:p-5">
						<h2 className="text-xl font-semibold tracking-tight">
							Current workspace snapshot
						</h2>
						<div className="mt-4 grid grid-cols-2 gap-3">
							<SmallStat label="QR codes" value={totalCodes} />
							<SmallStat label="Active codes" value={activeCodes} />
							<SmallStat label="Total views" value={totalViews} />
							<SmallStat label="People" value={teamMembers} />
						</div>
						<p className="mt-4 text-sm text-ds-text-secondary">
							Finish required steps to switch this screen to your compact
							analytics dashboard and recent code activity feed.
						</p>
					</section>
				</div>
			</div>
		);
	}

	const recentCodes = qrCodes.slice(0, RECENT_CODES_LIMIT);

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			{analyticsQuery.isError ? <AnalyticsNotice /> : null}
			<section className="mb-4 rounded-2xl border border-ds-border bg-ds-surface p-5 sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
						<p className="mt-1 text-sm text-ds-text-secondary sm:text-base">
							Quick performance summary for your active QR workspace.
						</p>
					</div>
					<Link
						to="/app/qr-codes/new"
						className="inline-flex h-10 items-center gap-2 rounded-xl border border-ds-accent bg-ds-accent px-4 text-sm font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover"
					>
						<QrCode className="h-4 w-4" />
						New QR code
					</Link>
				</div>

				<div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
					<SmallStat label="Total views" value={totalViews} />
					<SmallStat label="Views today" value={viewsToday} />
					<SmallStat label="Active codes" value={activeCodes} />
					<SmallStat label="People" value={teamMembers} />
				</div>
			</section>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
				<section className="rounded-2xl border border-ds-border bg-ds-surface">
					<div className="border-b border-ds-border px-4 py-3 sm:px-5">
						<h2 className="text-xl font-semibold tracking-tight">
							Analytics snapshot
						</h2>
						<p className="mt-1 text-xs text-ds-text-tertiary">
							Last {appliedAnalyticsRangeDays} days
						</p>
					</div>
					<div className="px-4 py-4 sm:px-5">
						<MiniTrendChart
							dailyScans={analytics.dailyScans.map((row) => ({
								date: row.date,
								value: row.scans,
							}))}
						/>
						<div className="mt-4 flex flex-wrap gap-2">
							<Link
								to="/app/analytics"
								className="inline-flex h-9 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
							>
								Open analytics
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</div>
				</section>

				<section className="rounded-2xl border border-ds-border bg-ds-surface">
					<div className="border-b border-ds-border px-4 py-3 sm:px-5">
						<h2 className="text-xl font-semibold tracking-tight">
							Recent QR codes
						</h2>
						<p className="mt-1 text-xs text-ds-text-tertiary">
							Most recently created links
						</p>
					</div>
					<div>
						{recentCodes.length === 0 ? (
							<div className="px-4 py-6 text-sm text-ds-text-secondary sm:px-5">
								No QR codes yet.
							</div>
						) : (
							recentCodes.map((code) => {
								const shortPath =
									buildQrShortPath(activeOrganizationSlug, code.slug) ||
									`/${code.slug}`;
								const openLink = shortPath || code.destinationUrl;
								return (
									<div
										key={code.id}
										className="border-b border-ds-border px-4 py-3 last:border-b-0 sm:px-5"
									>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
											<div className="min-w-0">
												<p className="truncate text-base font-semibold">
													{code.name}
												</p>
												<p className="mt-0.5 truncate text-xs text-ds-accent">
													{shortPath}
												</p>
												<p className="mt-0.5 text-xs text-ds-text-tertiary">
													{code.scanCount} views •{" "}
													{code.isActive ? "Active" : "Paused"}
												</p>
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<Link
													to="/app/qr-codes/$qrCodeId/edit"
													params={{ qrCodeId: String(code.id) }}
													className="inline-flex h-8 items-center gap-1 rounded-lg border border-ds-border bg-ds-input-bg px-2.5 text-xs font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
												>
													Edit
												</Link>
												<a
													href={openLink}
													target="_blank"
													rel="noreferrer"
													className="inline-flex h-8 items-center gap-1 rounded-lg border border-ds-border bg-ds-input-bg px-2.5 text-xs font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
												>
													<ExternalLink className="h-3.5 w-3.5" />
													Open
												</a>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

function AnalyticsNotice() {
	return (
		<div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
			Analytics are temporarily unavailable. QR management and onboarding are
			still available.
		</div>
	);
}

function OnboardingStepCard({
	step,
	index,
}: {
	step: OnboardingStep;
	index: number;
}) {
	return (
		<div className="rounded-xl border border-ds-border bg-ds-surface2/45 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-ds-border bg-ds-input-bg text-[10px] font-bold text-ds-text-tertiary">
							{index}
						</span>
						<h3 className="text-base font-semibold tracking-tight">
							{step.title}
						</h3>
					</div>
					<p className="mt-2 text-sm text-ds-text-secondary">
						{step.description}
					</p>
				</div>
				<span
					className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${
						step.done
							? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
							: "border-ds-border bg-ds-input-bg text-ds-text-tertiary"
					}`}
				>
					{step.done ? (
						<CheckCircle2 className="h-3.5 w-3.5" />
					) : (
						<Circle className="h-3.5 w-3.5" />
					)}
					{step.done ? "Done" : step.required ? "Required" : "Optional"}
				</span>
			</div>
			<div className="mt-3">
				<Link
					to={step.actionTo}
					className="inline-flex h-9 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
				>
					{step.actionLabel}
					<ArrowRight className="h-4 w-4" />
				</Link>
			</div>
		</div>
	);
}

function SmallStat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-3">
			<p className="text-xs font-medium text-ds-text-tertiary">{label}</p>
			<p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
		</div>
	);
}

function MiniTrendChart({
	dailyScans,
}: {
	dailyScans: Array<{ date: string; value: number }>;
}) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const points = useMemo(() => {
		const maxValue = Math.max(...dailyScans.map((row) => row.value), 1);
		return dailyScans.map((row, index) => {
			const x =
				dailyScans.length > 1 ? (index / (dailyScans.length - 1)) * 100 : 50;
			const y = MINI_CHART_BOTTOM - (row.value / maxValue) * MINI_CHART_HEIGHT;
			return { ...row, x, y };
		});
	}, [dailyScans]);

	const path = points
		.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
		.join(" ");
	const totalViews = dailyScans.reduce((sum, row) => sum + row.value, 0);
	const hoveredPoint =
		hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length
			? points[hoveredIndex]
			: null;
	const hoveredPercent = hoveredPoint ? hoveredPoint.x : null;

	const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
		if (points.length === 0) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		if (bounds.width <= 0) return;
		const pointerX = event.clientX - bounds.left;
		const clampedRatio = Math.min(1, Math.max(0, pointerX / bounds.width));
		const nextIndex = Math.round(clampedRatio * (points.length - 1));
		setHoveredIndex(nextIndex);
	};

	return (
		<div className="rounded-xl border border-ds-border bg-ds-input-bg p-3">
			<div className="flex items-center justify-between text-xs text-ds-text-tertiary">
				<span className="inline-flex items-center gap-1">
					<BarChart3 className="h-3.5 w-3.5 text-ds-accent" />
					View trend
				</span>
				<span>{totalViews} total views</span>
			</div>

			<div className="relative mt-3 h-36 w-full">
				{hoveredPoint && hoveredPercent !== null ? (
					<div
						className="pointer-events-none absolute top-2 z-10 w-36 -translate-x-1/2 rounded-lg border border-ds-border-strong/70 bg-ds-surface px-2.5 py-2 text-xs shadow-lg"
						style={{ left: `${Math.min(92, Math.max(8, hoveredPercent))}%` }}
					>
						<p className="font-semibold text-ds-fg">
							{formatMiniTrendDate(hoveredPoint.date)}
						</p>
						<p className="mt-0.5 text-ds-text-secondary">
							{hoveredPoint.value.toLocaleString()} views
						</p>
					</div>
				) : null}
				<svg
					viewBox="0 0 100 32"
					preserveAspectRatio="none"
					className="block h-full w-full"
					onPointerMove={handlePointerMove}
					onPointerEnter={handlePointerMove}
					onPointerLeave={() => setHoveredIndex(null)}
				>
					<title>QR views trend</title>
					{[6, 11, 16, 21, 26, 30].map((y) => (
						<line
							key={y}
							x1="0"
							y1={y}
							x2="100"
							y2={y}
							stroke="currentColor"
							className="text-ds-border"
							strokeWidth="0.7"
							vectorEffect="non-scaling-stroke"
						/>
					))}
					{path ? (
						<path
							d={path}
							fill="none"
							stroke="currentColor"
							className="text-ds-accent"
							strokeWidth="1.6"
							strokeLinecap="round"
							strokeLinejoin="round"
							vectorEffect="non-scaling-stroke"
						/>
					) : null}
					{hoveredPoint ? (
						<line
							x1={hoveredPoint.x}
							y1="4"
							x2={hoveredPoint.x}
							y2={MINI_CHART_BOTTOM}
							stroke="currentColor"
							className="text-ds-accent/45"
							strokeWidth="0.8"
							strokeDasharray="1.4 1.4"
							vectorEffect="non-scaling-stroke"
						/>
					) : null}
					{points.map((point) => (
						<line
							key={point.date}
							x1={point.x}
							y1={point.y}
							x2={point.x + 0.01}
							y2={point.y}
							stroke="currentColor"
							className="text-ds-accent"
							strokeWidth="4"
							strokeLinecap="round"
							vectorEffect="non-scaling-stroke"
						/>
					))}
					{hoveredPoint ? (
						<circle
							cx={hoveredPoint.x}
							cy={hoveredPoint.y}
							r="1"
							fill="currentColor"
							className="text-ds-accent"
							vectorEffect="non-scaling-stroke"
						/>
					) : null}
				</svg>
			</div>
		</div>
	);
}

function formatMiniTrendDate(value: string): string {
	const [year, month, day] = value.split("-").map((part) => Number(part));
	if (
		!Number.isFinite(year) ||
		!Number.isFinite(month) ||
		!Number.isFinite(day)
	) {
		return value;
	}
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

function DashboardSkeleton() {
	return (
		<div className="mx-auto w-full max-w-[1320px] space-y-4">
			<div className="h-36 animate-pulse rounded-2xl border border-ds-border bg-ds-surface2/50" />
			<div className="grid gap-4 xl:grid-cols-2">
				<div className="h-72 animate-pulse rounded-2xl border border-ds-border bg-ds-surface2/50" />
				<div className="h-72 animate-pulse rounded-2xl border border-ds-border bg-ds-surface2/50" />
			</div>
		</div>
	);
}
