import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import {
	ArrowUpDown,
	ChevronDown,
	CircleCheck,
	CirclePause,
	Copy,
	CopyPlus,
	Download,
	ExternalLink,
	Eye,
	Filter,
	PauseCircle,
	Pencil,
	PlayCircle,
	Plus,
	RotateCcw,
	Search,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { QrPreviewModal } from "@/components/qr/qr-preview-modal";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
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
import { NativeSelect } from "@/components/ui/native-select";
import { useTRPC } from "@/integrations/trpc/react";
import { authClient } from "@/lib/auth-client";
import { copyText, downloadCsv } from "@/lib/client-export";
import {
	buildQrPublicPreviewPath,
	buildQrShortPath,
	toAbsoluteUrl,
} from "@/lib/qr-links";

export const Route = createFileRoute("/app/qr-codes")({
	component: QrCodesPage,
});

type StatusFilter = "all" | "active" | "paused";
type SortOption = "newest" | "name" | "views";

function QrCodesPage() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isBaseListRoute =
		pathname === "/app/qr-codes" || pathname === "/app/qr-codes/";
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [previewCodeId, setPreviewCodeId] = useState<number | null>(null);
	const [deleteCodeId, setDeleteCodeId] = useState<number | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [tagFilter, setTagFilter] = useState("all");
	const [sortOption, setSortOption] = useState<SortOption>("newest");
	const { data: session } = authClient.useSession();
	const { data: organizationsData } = authClient.useListOrganizations();
	const activeOrganizationSlug = useMemo(() => {
		const activeOrganizationId = session?.session.activeOrganizationId ?? "";
		if (!activeOrganizationId) return "";
		return (
			organizationsData?.find(
				(organization) => organization.id === activeOrganizationId,
			)?.slug ?? ""
		);
	}, [organizationsData, session?.session.activeOrganizationId]);

	const {
		data: qrCodes,
		isLoading,
		isError,
		refetch,
	} = useQuery(trpc.qrCodes.list.queryOptions({ includeInactive: true }));

	const updateCode = useMutation(
		trpc.qrCodes.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update QR code.");
			},
		}),
	);

	const deleteCode = useMutation(
		trpc.qrCodes.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteCodeId(null);
				await queryClient.invalidateQueries();
				toast.success("QR code deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete QR code.");
			},
		}),
	);
	const duplicateCode = useMutation(
		trpc.qrCodes.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
				toast.success("QR code duplicated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to duplicate QR code.");
			},
		}),
	);

	const allCodes = useMemo(() => qrCodes ?? [], [qrCodes]);
	const allTags = useMemo(
		() =>
			Array.from(
				new Set(allCodes.flatMap((code) => code.tags).filter(Boolean)),
			).sort((a, b) => a.localeCompare(b)),
		[allCodes],
	);
	const visibleCodes = useMemo(() => {
		const normalizedQuery = searchValue.trim().toLowerCase();
		return allCodes
			.filter((code) => {
				if (statusFilter === "active" && !code.isActive) return false;
				if (statusFilter === "paused" && code.isActive) return false;
				if (tagFilter !== "all" && !code.tags.includes(tagFilter)) return false;
				if (!normalizedQuery) return true;
				return [code.name, code.slug, code.destinationUrl, ...code.tags].some(
					(value) => value.toLowerCase().includes(normalizedQuery),
				);
			})
			.sort((left, right) => {
				if (sortOption === "name") return left.name.localeCompare(right.name);
				if (sortOption === "views") return right.scanCount - left.scanCount;
				return right.createdAt.getTime() - left.createdAt.getTime();
			});
	}, [allCodes, searchValue, sortOption, statusFilter, tagFilter]);
	const previewCode = useMemo(
		() => allCodes.find((code) => code.id === previewCodeId) ?? null,
		[allCodes, previewCodeId],
	);
	const deleteCandidate = useMemo(
		() => allCodes.find((code) => code.id === deleteCodeId) ?? null,
		[allCodes, deleteCodeId],
	);
	const previewCodePath = useMemo(() => {
		if (!previewCode) return "";
		return (
			buildQrShortPath(activeOrganizationSlug, previewCode.slug) ||
			previewCode.destinationUrl
		);
	}, [activeOrganizationSlug, previewCode]);
	const previewPublicPath = useMemo(() => {
		if (!previewCode?.isPublic) return "";
		return buildQrPublicPreviewPath(activeOrganizationSlug, previewCode.slug);
	}, [activeOrganizationSlug, previewCode]);
	const hasActiveFilters =
		Boolean(searchValue.trim()) ||
		statusFilter !== "all" ||
		tagFilter !== "all";

	const copyShortLink = async (slug: string) => {
		const path = buildQrShortPath(activeOrganizationSlug, slug);
		if (!path) return;
		try {
			await copyText(toAbsoluteUrl(path));
			toast.success("Short link copied");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Unable to copy short link.",
			);
		}
	};

	const handleDuplicate = async (code: (typeof allCodes)[number]) => {
		await duplicateCode.mutateAsync({
			name: `${code.name} copy`,
			destinationUrl: code.destinationUrl,
			destinations: code.destinations.map((destination) => ({
				id: destination.id,
				label: destination.label ?? undefined,
				url: destination.url,
				weight: destination.weight,
			})),
			slug: `${code.slug}-copy`,
			tags: code.tags,
			isPublic: code.isPublic,
			isActive: code.isActive,
		});
	};

	const exportInventory = () => {
		downloadCsv(`qr-inventory-${new Date().toISOString().slice(0, 10)}`, [
			[
				"Name",
				"Short link",
				"Primary destination",
				"Destinations",
				"Views",
				"Status",
				"Public page",
				"Tags",
				"Created",
			],
			...visibleCodes.map((code) => [
				code.name,
				toAbsoluteUrl(
					buildQrShortPath(activeOrganizationSlug, code.slug) ||
						`/${code.slug}`,
				),
				code.destinationUrl,
				code.destinations.length,
				code.scanCount,
				code.isActive ? "Active" : "Paused",
				code.isPublic ? "Enabled" : "Disabled",
				code.tags.join("; "),
				code.createdAt.toISOString(),
			]),
		]);
		toast.success(
			`Exported ${visibleCodes.length} ${visibleCodes.length === 1 ? "code" : "codes"}`,
		);
	};

	if (!isBaseListRoute) {
		return <Outlet />;
	}

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
				<div>
					<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
						QR codes
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-ds-text-secondary sm:text-base">
						Design, create, and manage destination links with scan tracking.
					</p>
				</div>
				<Link
					to="/app/qr-codes/new"
					className="inline-flex h-10 items-center gap-2 rounded-xl bg-ds-accent px-4 text-sm font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover sm:h-11 sm:px-5 sm:text-base"
				>
					<Plus className="h-5 w-5" />
					New QR code
				</Link>
			</div>

			<div className="mb-4 rounded-2xl border border-ds-border bg-ds-surface p-3 sm:p-4">
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_180px_180px_auto]">
					<div className="relative">
						<Search
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-text-tertiary"
						/>
						<input
							aria-label="Search QR codes"
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							placeholder="Search name, link, destination, or tag"
							className="h-10 w-full rounded-xl border border-ds-border bg-ds-input-bg py-2 pl-9 pr-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
						/>
					</div>
					<div className="relative">
						<Filter
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ds-text-tertiary"
						/>
						<NativeSelect
							aria-label="Filter QR codes by status"
							value={statusFilter}
							onChange={(event) =>
								setStatusFilter(event.target.value as StatusFilter)
							}
							className="h-10 border border-ds-border bg-ds-input-bg pl-9 text-sm text-ds-fg"
						>
							<option value="all">All statuses</option>
							<option value="active">Active</option>
							<option value="paused">Paused</option>
						</NativeSelect>
					</div>
					<div className="relative">
						<Filter
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ds-text-tertiary"
						/>
						<NativeSelect
							aria-label="Filter QR codes by tag"
							value={tagFilter}
							onChange={(event) => setTagFilter(event.target.value)}
							className="h-10 border border-ds-border bg-ds-input-bg pl-9 text-sm text-ds-fg"
						>
							<option value="all">All tags</option>
							{allTags.map((tag) => (
								<option key={tag} value={tag}>
									{tag}
								</option>
							))}
						</NativeSelect>
					</div>
					<div className="relative">
						<ArrowUpDown
							aria-hidden="true"
							className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ds-text-tertiary"
						/>
						<NativeSelect
							aria-label="Sort QR codes"
							value={sortOption}
							onChange={(event) =>
								setSortOption(event.target.value as SortOption)
							}
							className="h-10 border border-ds-border bg-ds-input-bg pl-9 text-sm text-ds-fg"
						>
							<option value="newest">Newest first</option>
							<option value="name">Name A–Z</option>
							<option value="views">Most viewed</option>
						</NativeSelect>
					</div>
					<button
						type="button"
						onClick={() => {
							setSearchValue("");
							setStatusFilter("all");
							setTagFilter("all");
						}}
						disabled={!hasActiveFilters}
						className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:cursor-not-allowed disabled:opacity-50"
					>
						<RotateCcw aria-hidden="true" className="h-4 w-4" />
						Reset
					</button>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-ds-border bg-ds-surface">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-ds-border px-4 py-3 sm:px-5">
					<div>
						<h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
							Managed codes
						</h2>
						<p className="mt-0.5 text-xs text-ds-text-tertiary">
							Showing {visibleCodes.length} of {allCodes.length}
						</p>
					</div>
					<button
						type="button"
						onClick={exportInventory}
						disabled={visibleCodes.length === 0}
						className="inline-flex h-9 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-50"
					>
						<Download aria-hidden="true" className="h-4 w-4" />
						Export CSV
					</button>
				</div>
				{isError ? (
					<div role="alert" className="space-y-3 px-4 py-6 sm:px-5">
						<p className="font-semibold text-red-700 dark:text-red-300">
							QR codes could not be loaded.
						</p>
						<p className="text-sm text-ds-text-secondary">
							Check your connection and try again.
						</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="inline-flex h-9 items-center rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
						>
							Try again
						</button>
					</div>
				) : isLoading ? (
					<div className="space-y-2 p-4">
						{[1, 2, 3].map((row) => (
							<div
								key={row}
								className="h-16 animate-pulse rounded-xl border border-ds-border bg-ds-surface2/50"
							/>
						))}
					</div>
				) : allCodes.length === 0 ? (
					<div className="space-y-3 px-4 py-5 text-sm text-ds-text-secondary sm:px-5">
						<p>No QR codes yet.</p>
						<Link
							to="/app/qr-codes/new"
							className="inline-flex h-9 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
						>
							<Plus className="h-4 w-4" />
							Create your first code
						</Link>
					</div>
				) : visibleCodes.length === 0 ? (
					<div className="px-4 py-8 text-center sm:px-5">
						<p className="font-semibold text-ds-fg">No matching QR codes</p>
						<p className="mt-1 text-sm text-ds-text-secondary">
							Try another search or clear the active filters.
						</p>
						<button
							type="button"
							onClick={() => {
								setSearchValue("");
								setStatusFilter("all");
								setTagFilter("all");
							}}
							className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary hover:border-ds-accent hover:text-ds-accent"
						>
							<RotateCcw aria-hidden="true" className="h-4 w-4" />
							Clear filters
						</button>
					</div>
				) : (
					<div>
						{visibleCodes.map((code) => (
							<div
								key={code.id}
								data-testid="qr-code-row"
								data-code-name={code.name}
								className="border-b border-ds-border px-4 py-4 last:border-b-0 sm:px-5"
							>
								<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<div className="min-w-0 flex-1">
										{/*
											Short links are the tracked entrypoint. Destination remains visible as the final target.
										*/}
										<div className="text-lg font-semibold tracking-tight sm:text-xl">
											{code.name}
										</div>
										<div className="mt-1 text-sm text-ds-accent">
											<span className="font-semibold">Short link:</span>{" "}
											<span className="[overflow-wrap:anywhere]">
												{buildQrShortPath(activeOrganizationSlug, code.slug) ||
													`/${code.slug}`}
											</span>
										</div>
										{code.isPublic ? (
											<div className="mt-1 text-sm text-ds-text-secondary">
												<span className="font-semibold">Public QR page:</span>{" "}
												<a
													href={buildQrPublicPreviewPath(
														activeOrganizationSlug,
														code.slug,
													)}
													target="_blank"
													rel="noreferrer"
													className="font-semibold text-ds-accent [overflow-wrap:anywhere] hover:underline"
												>
													{buildQrPublicPreviewPath(
														activeOrganizationSlug,
														code.slug,
													)}
												</a>
											</div>
										) : (
											<div className="mt-1 text-sm text-ds-text-tertiary">
												Public QR page is disabled
											</div>
										)}
										<div className="mt-2 text-sm text-ds-text-tertiary">
											<span className="font-medium text-ds-text-secondary">
												Primary destination:
											</span>{" "}
											<span className="[overflow-wrap:anywhere]">
												{code.destinationUrl}
											</span>
										</div>
										<div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
											<span className="rounded-full border border-ds-border bg-ds-surface2 px-2.5 py-1 text-ds-text-secondary">
												{(code.destinations?.length ?? 0) > 1
													? `${code.destinations?.length ?? 0} weighted destinations`
													: "Single destination"}
											</span>
											<span className="rounded-full border border-ds-border bg-ds-surface2 px-2.5 py-1 text-ds-text-secondary">
												{code.scanCount}{" "}
												{code.scanCount === 1 ? "view" : "views"}
											</span>
											<span
												className={
													code.isActive
														? "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"
														: "inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300"
												}
											>
												{code.isActive ? (
													<CircleCheck
														aria-hidden="true"
														className="h-3.5 w-3.5"
													/>
												) : (
													<CirclePause
														aria-hidden="true"
														className="h-3.5 w-3.5"
													/>
												)}
												{code.isActive ? "Active" : "Paused"}
											</span>
											{code.tags.map((tag) => (
												<span
													key={tag}
													className="rounded-full border border-ds-accent/25 bg-ds-accent/8 px-2.5 py-1 text-ds-accent"
												>
													#{tag}
												</span>
											))}
										</div>
									</div>
									<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
										<button
											type="button"
											aria-label={`View QR for ${code.name}`}
											onClick={() => setPreviewCodeId(code.id)}
											className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-2.5 text-xs font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent sm:px-3 sm:text-sm"
										>
											<Eye className="h-4 w-4" />
											View QR
										</button>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													aria-label={`Actions for ${code.name}`}
													className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-2.5 text-xs font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent sm:px-3 sm:text-sm"
												>
													Actions
													<ChevronDown className="h-4 w-4" />
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												className="w-48 border border-ds-border bg-ds-surface p-1"
											>
												<DropdownMenuItem asChild className="cursor-pointer">
													<Link
														to="/app/qr-codes/$qrCodeId/edit"
														params={{ qrCodeId: String(code.id) }}
													>
														<Pencil className="h-4 w-4" />
														Edit
													</Link>
												</DropdownMenuItem>
												<DropdownMenuItem asChild className="cursor-pointer">
													<a
														href={
															buildQrShortPath(
																activeOrganizationSlug,
																code.slug,
															) || code.destinationUrl
														}
														target="_blank"
														rel="noreferrer"
													>
														<ExternalLink className="h-4 w-4" />
														Open link
													</a>
												</DropdownMenuItem>
												<DropdownMenuItem
													onSelect={() => void copyShortLink(code.slug)}
													className="cursor-pointer"
												>
													<Copy className="h-4 w-4" />
													Copy short link
												</DropdownMenuItem>
												<DropdownMenuItem
													disabled={duplicateCode.isPending}
													onSelect={() => void handleDuplicate(code)}
													className="cursor-pointer"
												>
													<CopyPlus className="h-4 w-4" />
													Duplicate
												</DropdownMenuItem>
												{code.isPublic ? (
													<DropdownMenuItem asChild className="cursor-pointer">
														<a
															href={buildQrPublicPreviewPath(
																activeOrganizationSlug,
																code.slug,
															)}
															target="_blank"
															rel="noreferrer"
														>
															<ExternalLink className="h-4 w-4" />
															Public page
														</a>
													</DropdownMenuItem>
												) : null}
												<DropdownMenuItem
													onSelect={() => {
														void updateCode.mutateAsync({
															id: code.id,
															isActive: !code.isActive,
														});
													}}
													className="cursor-pointer"
												>
													{code.isActive ? (
														<PauseCircle className="h-4 w-4" />
													) : (
														<PlayCircle className="h-4 w-4" />
													)}
													{code.isActive ? "Pause" : "Resume"}
												</DropdownMenuItem>
												<DropdownMenuSeparator className="my-1 bg-ds-border" />
												<DropdownMenuItem
													onSelect={() => {
														setDeleteCodeId(code.id);
													}}
													variant="destructive"
													className="cursor-pointer"
												>
													<Trash2 className="h-4 w-4" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<QrPreviewModal
				open={Boolean(previewCode)}
				onOpenChange={(open) => {
					if (!open) {
						setPreviewCodeId(null);
					}
				}}
				name={previewCode?.name ?? "QR code"}
				data={previewCodePath}
				shortLinkPath={
					previewCode
						? (buildQrShortPath(activeOrganizationSlug, previewCode.slug) ?? "")
						: ""
				}
				publicPagePath={previewPublicPath}
			/>

			<Dialog
				open={Boolean(deleteCandidate)}
				onOpenChange={(open) => {
					if (!open && !deleteCode.isPending) setDeleteCodeId(null);
				}}
			>
				<DialogContent className="border border-ds-border bg-ds-surface">
					<DialogHeader>
						<DialogTitle>Delete QR code?</DialogTitle>
						<DialogDescription className="text-ds-text-secondary">
							{deleteCandidate
								? `“${deleteCandidate.name}” and its analytics history will be permanently deleted.`
								: "This QR code and its analytics history will be permanently deleted."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<button
								type="button"
								disabled={deleteCode.isPending}
								className="inline-flex h-10 items-center justify-center rounded-xl border border-ds-border bg-ds-input-bg px-4 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
							>
								Cancel
							</button>
						</DialogClose>
						<button
							type="button"
							disabled={!deleteCandidate || deleteCode.isPending}
							onClick={() => {
								if (deleteCandidate) {
									void deleteCode.mutateAsync({ id: deleteCandidate.id });
								}
							}}
							className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
						>
							{deleteCode.isPending ? "Deleting..." : "Delete permanently"}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
