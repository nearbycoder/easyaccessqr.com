import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, ChevronDown, QrCode, ScanLine } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { useTRPC } from "@/integrations/trpc/react";

export const Route = createFileRoute("/app/analytics")({
	component: AnalyticsPage,
});

const RANGE_OPTIONS = [
	{ value: 7 as const, label: "7D" },
	{ value: 14 as const, label: "14D" },
	{ value: 30 as const, label: "30D" },
	{ value: 60 as const, label: "60D" },
	{ value: 90 as const, label: "90D" },
];

function AnalyticsPage() {
	const trpc = useTRPC();
	const qrCodeFieldId = useId();
	const [rangeDays, setRangeDays] = useState<7 | 14 | 30 | 60 | 90>(30);
	const [selectedCodeId, setSelectedCodeId] = useState("all");

	const { data: qrCodes } = useQuery(
		trpc.qrCodes.list.queryOptions({ includeInactive: true }),
	);
	const analyticsQuery = useQuery(
		trpc.qrCodes.getAnalytics.queryOptions({
			rangeDays,
			qrCodeId:
				selectedCodeId === "all"
					? undefined
					: Number.parseInt(selectedCodeId, 10),
		}),
	);

	const analytics = analyticsQuery.data;

	return (
		<div className="mx-auto w-full max-w-[1260px]">
			<div className="mb-6 sm:mb-8">
				<div>
					<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
						Analytics
					</h1>
					<p className="mt-1 text-base text-ds-text-secondary">
						View trends, top-performing codes, and usage activity
					</p>
				</div>
			</div>

			<div className="mb-5 rounded-2xl border border-ds-border bg-ds-surface p-4 sm:p-5">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					<div>
						<label
							htmlFor={qrCodeFieldId}
							className="mb-2 block text-xs font-semibold text-ds-text-tertiary"
						>
							QR code
						</label>
						<div className="relative">
							<select
								id={qrCodeFieldId}
								value={selectedCodeId}
								onChange={(event) => setSelectedCodeId(event.target.value)}
								className="h-11 w-full appearance-none rounded-xl border border-ds-border bg-white px-3 pr-10 text-sm text-ds-fg outline-none transition-colors focus:border-ds-accent"
							>
								<option value="all">All Codes</option>
								{(qrCodes ?? []).map((code) => (
									<option key={code.id} value={String(code.id)}>
										{code.name}
									</option>
								))}
							</select>
							<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ds-text-tertiary">
								<ChevronDown className="h-4 w-4" />
							</span>
						</div>
					</div>
					<div>
						<div className="mb-2 block text-xs font-semibold text-ds-text-tertiary">
							Range
						</div>
						<div className="flex flex-wrap gap-2">
							{RANGE_OPTIONS.map((option) => {
								const isActive = rangeDays === option.value;
								return (
									<button
										key={option.value}
										type="button"
										onClick={() => setRangeDays(option.value)}
										className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
											isActive
												? "border-ds-accent bg-ds-accent/10 text-ds-accent"
												: "border-ds-border bg-white text-ds-text-tertiary hover:border-ds-accent hover:text-ds-accent"
										}`}
									>
										{option.label}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{analyticsQuery.isLoading || !analytics ? (
				<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
					{[1, 2, 3, 4].map((row) => (
						<div
							key={row}
							className="h-24 animate-pulse rounded-2xl border border-ds-border bg-ds-surface"
						/>
					))}
				</div>
			) : (
				<>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
						<StatCard
							label="Total Views"
							value={analytics.totals.totalScans}
							icon={<ScanLine className="h-4 w-4" />}
						/>
						<StatCard
							label="Views Today"
							value={analytics.totals.scansToday}
							icon={<Activity className="h-4 w-4" />}
						/>
						<StatCard
							label="QR codes"
							value={analytics.totals.qrCodes}
							icon={<QrCode className="h-4 w-4" />}
						/>
						<StatCard
							label="Active Codes"
							value={analytics.totals.activeQrCodes}
							icon={<QrCode className="h-4 w-4" />}
						/>
					</div>

					<div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
						<DailyScanTrend dailyScans={analytics.dailyScans} />

						<div className="overflow-hidden rounded-2xl border border-ds-border bg-ds-surface">
							<div className="border-b border-ds-border px-4 py-3">
								<h2 className="text-2xl font-semibold tracking-tight">
									Top codes
								</h2>
							</div>
							<div>
								{analytics.topCodes.length === 0 ? (
									<div className="px-4 py-5 text-sm text-ds-text-secondary">
										No views in selected range.
									</div>
								) : (
									analytics.topCodes.map((code) => (
										<div
											key={code.id}
											className="border-b border-ds-border px-4 py-3 last:border-b-0"
										>
											<div className="text-lg font-semibold">{code.name}</div>
											<div className="mt-1 text-sm text-ds-text-tertiary">
												/{code.slug}
											</div>
											<div className="mt-1 text-sm font-semibold text-ds-accent">
												{code.scansInRange} Views In Range
											</div>
											{code.destinationCount > 1 ? (
												<DestinationHitBreakdown
													destinationHits={code.destinationHits}
													scansInRange={code.scansInRange}
													unattributedViewsInRange={code.unattributedViewsInRange}
												/>
											) : null}
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function StatCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: number;
	icon: ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-ds-border bg-ds-surface p-4">
			<div className="flex items-center justify-between text-ds-accent">
				<span className="text-sm font-semibold text-ds-text-secondary">
					{label}
				</span>
				{icon}
			</div>
			<div className="mt-3 text-5xl font-bold tracking-tight">{value}</div>
		</div>
	);
}

function DailyScanTrend({
	dailyScans,
}: {
	dailyScans: Array<{ date: string; scans: number; uniqueQrCodes: number }>;
}) {
	const totalScans = dailyScans.reduce((sum, row) => sum + row.scans, 0);
	const averageScans = dailyScans.length ? totalScans / dailyScans.length : 0;
	const activeDays = dailyScans.filter((row) => row.scans > 0).length;
	const peakDay = dailyScans.reduce(
		(peak, row) => (row.scans > peak.scans ? row : peak),
		dailyScans[0] ?? { date: "", scans: 0, uniqueQrCodes: 0 },
	) ?? { date: "", scans: 0, uniqueQrCodes: 0 };

	const maxScans = Math.max(...dailyScans.map((row) => row.scans), 0);
	const maxCodes = Math.max(...dailyScans.map((row) => row.uniqueQrCodes), 0);
	const chartWidth = 300;
	const chartHeight = 100;
	const chartLeft = 10;
	const chartRight = 290;
	const chartTop = 12;
	const chartBottom = 82;
	const chartRange = chartBottom - chartTop;
	const pointCount = dailyScans.length;

	const points = dailyScans.map((row, index) => {
		const ratio = pointCount > 1 ? index / (pointCount - 1) : 0.5;
		const x = chartLeft + ratio * (chartRight - chartLeft);
		const y =
			maxScans === 0
				? chartBottom
				: chartBottom - (row.scans / maxScans) * chartRange;
		const codeBarHeight =
			maxCodes === 0 ? 0 : (row.uniqueQrCodes / maxCodes) * (chartRange * 0.25);

		return { ...row, x, y, codeBarHeight };
	});

	const linePath = points
		.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
		.join(" ");
	const areaPath = points.length
		? `${linePath} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`
		: "";
	const midPoint = points[Math.floor(points.length / 2)];
	const gridLines = Array.from({ length: 5 }, (_, index) => {
		const ratio = index / 4;
		return chartTop + ratio * (chartBottom - chartTop);
	});
	const markerPoints = points.filter(
		(point, index) =>
			point.scans > 0 || index === 0 || index === points.length - 1,
	);

	return (
		<div className="overflow-hidden rounded-2xl border border-ds-border bg-ds-surface">
			<div className="border-b border-ds-border px-4 py-3">
				<h2 className="text-2xl font-semibold tracking-tight">View trend</h2>
			</div>
			<div className="px-4 py-4">
				<div className="mb-4 grid grid-cols-3 gap-2">
					<TrendStat
						label="Peak day"
						value={`${peakDay.scans.toLocaleString()} views`}
					/>
					<TrendStat
						label="Active days"
						value={`${activeDays}/${dailyScans.length}`}
					/>
					<TrendStat label="Average/day" value={averageScans.toFixed(1)} />
				</div>

				<div className="rounded-xl border border-ds-border bg-white p-3">
					<div className="w-full aspect-[3/1] min-h-[210px]">
						<svg
							viewBox={`0 0 ${chartWidth} ${chartHeight}`}
							className="h-full w-full"
						>
							<title>Views over time</title>
							{gridLines.map((y) => (
								<line
									key={y}
									x1={chartLeft}
									y1={y}
									x2={chartRight}
									y2={y}
									stroke="currentColor"
									className="text-ds-border/70"
									strokeWidth="0.5"
								/>
							))}
							{points.map((point) => (
								<rect
									key={`${point.date}-codes`}
									x={point.x - 1.3}
									y={chartBottom - point.codeBarHeight}
									width={2.6}
									height={point.codeBarHeight}
									fill="currentColor"
									className="text-ds-border-strong/70"
								/>
							))}
							{areaPath ? (
								<path
									d={areaPath}
									fill="currentColor"
									className="text-ds-accent/12"
								/>
							) : null}
							{linePath ? (
								<path
									d={linePath}
									fill="none"
									stroke="currentColor"
									className="text-ds-accent"
									strokeWidth="1.8"
									strokeLinejoin="round"
									strokeLinecap="round"
								/>
							) : null}
							{markerPoints.map((point) => (
								<circle
									key={`${point.date}-point`}
									cx={point.x}
									cy={point.y}
									r="1.1"
									fill="currentColor"
									className="text-ds-accent"
								/>
							))}
						</svg>
					</div>
					<div className="mt-1 flex items-center justify-between text-xs text-ds-text-tertiary">
						<span>{formatShortDate(points[0]?.date)}</span>
						<span>{formatShortDate(midPoint?.date)}</span>
						<span>{formatShortDate(points[points.length - 1]?.date)}</span>
					</div>
				</div>

				{totalScans === 0 ? (
					<p className="mt-3 text-sm text-ds-text-secondary">
						No views in this range yet. Create traffic on your QR links to
						populate the trend.
					</p>
				) : null}
			</div>
		</div>
	);
}

function TrendStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-ds-border bg-ds-surface2/50 px-3 py-2">
			<div className="text-xs text-ds-text-tertiary">{label}</div>
			<div className="text-sm font-semibold text-ds-fg">{value}</div>
		</div>
	);
}

function DestinationHitBreakdown({
	destinationHits,
	scansInRange,
	unattributedViewsInRange,
}: {
	destinationHits: Array<{
		id: string;
		label: string;
		url: string;
		weight: number;
		viewsInRange: number;
		isConfigured: boolean;
	}>;
	scansInRange: number;
	unattributedViewsInRange: number;
}) {
	const hitDestinations = destinationHits.filter(
		(destination) => destination.viewsInRange > 0,
	);
	const noHitCount = destinationHits.length - hitDestinations.length;

	if (hitDestinations.length === 0 && unattributedViewsInRange === 0) {
		return (
			<div className="mt-2 rounded-xl border border-ds-border bg-ds-surface2/40 px-3 py-2 text-xs text-ds-text-secondary">
				No destination views in this range yet.
			</div>
		);
	}

	const baseTotal = Math.max(scansInRange, 0);
	const safeTotal = baseTotal > 0 ? baseTotal : 1;

	return (
		<div className="mt-2 rounded-xl border border-ds-border bg-ds-surface2/40 p-3">
			<div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ds-text-tertiary">
				Destination views
			</div>
			<div className="mt-2 space-y-2">
				{hitDestinations.map((destination) => {
					const share = Math.round(
						(destination.viewsInRange / safeTotal) * 100,
					);
					return (
						<div
							key={`${destination.id}-${destination.url}`}
							className="rounded-lg border border-ds-border bg-ds-surface px-2.5 py-2"
						>
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0 text-sm font-semibold">
									{destination.label}
								</div>
								<div className="shrink-0 text-xs font-semibold text-ds-accent">
									{destination.viewsInRange} views ({share}%)
								</div>
							</div>
							<div className="mt-0.5 truncate text-xs text-ds-text-tertiary">
								{destination.url}
							</div>
						</div>
					);
				})}
				{unattributedViewsInRange > 0 ? (
					<div className="rounded-lg border border-ds-border bg-ds-surface px-2.5 py-2">
						<div className="flex items-center justify-between gap-2">
							<div className="text-sm font-semibold">Legacy unattributed</div>
							<div className="shrink-0 text-xs font-semibold text-ds-accent">
								{unattributedViewsInRange} views
							</div>
						</div>
						<div className="mt-0.5 text-xs text-ds-text-tertiary">
							Views recorded before destination-level tracking.
						</div>
					</div>
				) : null}
				{noHitCount > 0 ? (
					<div className="text-xs text-ds-text-secondary">
						{noHitCount} destination{noHitCount === 1 ? "" : "s"} had no
						views in this range.
					</div>
				) : null}
			</div>
		</div>
	);
}

function formatShortDate(date: string | undefined) {
	if (!date) return "—";
	const parsed = new Date(`${date}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return date;
	return parsed.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}
