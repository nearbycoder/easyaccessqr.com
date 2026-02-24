import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTRPC } from "@/integrations/trpc/react";

export const Route = createFileRoute("/app/user/$userId")({
	component: UserProfileRoute,
});

const PAGE_SIZE = 20;

function formatDate(dateLike: string | Date | null | undefined) {
	if (!dateLike) return "Unknown";
	const parsed = new Date(dateLike);
	if (Number.isNaN(parsed.getTime())) return "Unknown";
	return parsed.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.join("")
		.slice(0, 2);
}

function UserProfileRoute() {
	const { userId } = Route.useParams();
	return <UserProfilePage key={userId} userId={userId} />;
}

function UserProfilePage({ userId }: { userId: string }) {
	const trpc = useTRPC();
	const [cursorCreatedAt, setCursorCreatedAt] = useState<string | undefined>(
		undefined,
	);
	const [codes, setCodes] = useState<
		Array<{
			id: number;
			name: string;
			slug: string;
			destinationUrl: string;
			isActive: boolean;
			scanCount: number;
			lastScannedAt: Date | null;
			createdAt: Date;
		}>
	>([]);
	const [nextCursorCreatedAt, setNextCursorCreatedAt] = useState<string | null>(
		null,
	);
	const [hasMore, setHasMore] = useState(false);
	const consumedCursorRef = useRef<Set<string>>(new Set());

	const profileQuery = useQuery({
		...trpc.profile.getUserProfile.queryOptions({
			userId,
			limit: PAGE_SIZE,
			cursorCreatedAt,
		}),
		placeholderData: (previousData) => previousData,
	});

	useEffect(() => {
		if (!profileQuery.data) return;
		const cursorKey = cursorCreatedAt ?? "__initial__";
		if (consumedCursorRef.current.has(cursorKey)) return;
		consumedCursorRef.current.add(cursorKey);

		const incoming = profileQuery.data.qrCodes.items;
		setCodes((previous) => {
			if (!cursorCreatedAt) return incoming;
			const existing = new Set(previous.map((item) => item.id));
			const deduped = incoming.filter((item) => !existing.has(item.id));
			return [...previous, ...deduped];
		});
		setHasMore(profileQuery.data.qrCodes.hasMore);
		setNextCursorCreatedAt(profileQuery.data.qrCodes.nextCursorCreatedAt);
	}, [profileQuery.data, cursorCreatedAt]);

	const loadMore = () => {
		if (!nextCursorCreatedAt || profileQuery.isFetching) return;
		setCursorCreatedAt(nextCursorCreatedAt);
	};

	const profile = profileQuery.data;

	if (profileQuery.isLoading && !profile) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				<div className="h-36 animate-pulse border-2 border-ds-muted3 rounded-xl bg-ds-surface/20" />
				<div className="mt-4 h-56 animate-pulse border-2 border-ds-muted3 rounded-xl bg-ds-surface/20" />
			</div>
		);
	}

	if (profileQuery.isError || !profile) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				<div className="border-2 border-red-500/60 bg-red-500/5 px-4 py-3 text-sm text-red-400">
					Profile Load Error{" "}
					{profileQuery.error instanceof Error
						? profileQuery.error.message
						: "Unable to load this profile."}
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-6 flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center bg-ds-accent text-sm font-extrabold text-ds-accent-fg">
						{getInitials(profile.user.name)}
					</div>
					<div>
						<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
							{profile.user.name}
						</h1>
						<p className="mt-1 text-sm text-ds-muted">
							Added to org {formatDate(profile.organizationMembership.joinedAt)}
						</p>
					</div>
				</div>
			</div>

			<div className="border-2 border-ds-muted3 rounded-xl p-4">
				<div className="mb-2 text-xs font-extrabold tracking-wide text-ds-text-tertiary">
					Bio
				</div>
				{profile.user.bio ? (
					<p className="whitespace-pre-wrap text-sm leading-relaxed text-ds-text-secondary">
						{profile.user.bio}
					</p>
				) : (
					<p className="text-sm text-ds-muted">No bio set yet.</p>
				)}
			</div>

			<div className="mt-6 border-2 border-ds-muted3 rounded-xl">
				<div className="border-b-2 border-ds-muted3 px-4 py-3 sm:px-5">
					<div className="flex items-center justify-between gap-2">
						<div>
							<h2 className="text-sm font-extrabold tracking-wide">
								Created QR codes
							</h2>
							<p className="mt-1 text-[11px] text-ds-text-tertiary">
								Author timeline
							</p>
						</div>
						<div className="text-[10px] font-extrabold tracking-wide text-ds-text-tertiary">
							{codes.length} codes loaded
						</div>
					</div>
				</div>

				{codes.length > 0 ? (
					<div>
						{codes.map((code) => (
							<div
								key={code.id}
								className="border-b-[2px] border-ds-muted3/70 px-4 py-4 last:border-b-0 sm:px-5"
							>
								<div className="mb-2 flex items-center justify-between gap-2">
									<div className="text-xs font-extrabold tracking-wide">
										{code.name}
									</div>
									<div className="text-[10px] font-bold tracking-wide text-ds-accent">
										{code.scanCount} Scans
									</div>
								</div>
								<div className="text-[11px] text-ds-text-tertiary">
									/{code.slug} • Created {formatDate(code.createdAt)}
								</div>
								<div className="mt-1 break-all text-[11px] text-ds-muted">
									{code.destinationUrl}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="px-4 py-5 text-sm text-ds-muted sm:px-5">
						No QR codes created yet.
					</div>
				)}
			</div>

			{hasMore && (
				<button
					type="button"
					onClick={loadMore}
					disabled={profileQuery.isFetching}
					className="mt-4 inline-flex items-center gap-2 border-[2px] border-ds-muted3 px-3 py-1.5 text-[10px] font-extrabold tracking-wide text-ds-text-tertiary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:cursor-not-allowed disabled:opacity-50"
				>
					<QrCode className="h-3.5 w-3.5" />
					{profileQuery.isFetching ? "Loading..." : "Load more"}
				</button>
			)}
		</div>
	);
}
