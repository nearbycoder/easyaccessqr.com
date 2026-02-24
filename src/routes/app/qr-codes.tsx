import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Link,
	Outlet,
	createFileRoute,
	useRouterState,
} from "@tanstack/react-router";
import {
	ChevronDown,
	Eye,
	ExternalLink,
	PauseCircle,
	Pencil,
	PlayCircle,
	Plus,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { QrPreviewModal } from "@/components/qr/qr-preview-modal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/integrations/trpc/react";
import { authClient } from "@/lib/auth-client";
import { buildQrPublicPreviewPath, buildQrShortPath } from "@/lib/qr-links";

export const Route = createFileRoute("/app/qr-codes")({
	component: QrCodesPage,
});

function QrCodesPage() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isBaseListRoute =
		pathname === "/app/qr-codes" || pathname === "/app/qr-codes/";
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [previewCodeId, setPreviewCodeId] = useState<number | null>(null);
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

	const { data: qrCodes, isLoading } = useQuery(
		trpc.qrCodes.list.queryOptions({ includeInactive: true }),
	);

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
				await queryClient.invalidateQueries();
				toast.success("QR code deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete QR code.");
			},
		}),
	);

	const sortedCodes = useMemo(() => qrCodes ?? [], [qrCodes]);
	const previewCode = useMemo(
		() => sortedCodes.find((code) => code.id === previewCodeId) ?? null,
		[previewCodeId, sortedCodes],
	);
	const previewCodePath = useMemo(() => {
		if (!previewCode) return "";
		return (
			buildQrShortPath(activeOrganizationSlug, previewCode.slug) ||
			previewCode.destinationUrl
		);
	}, [activeOrganizationSlug, previewCode]);
	const previewPublicPath = useMemo(() => {
		if (!previewCode || !previewCode.isPublic) return "";
		return buildQrPublicPreviewPath(activeOrganizationSlug, previewCode.slug);
	}, [activeOrganizationSlug, previewCode]);

	if (!isBaseListRoute) {
		return <Outlet />;
	}

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-8 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-extrabold tracking-tighter sm:text-3xl">
						QR codes
					</h1>
					<p className="mt-1 text-base text-ds-text-secondary">
						Design, create, and manage destination links with scan tracking.
					</p>
				</div>
				<Link
					to="/app/qr-codes/new"
					className="inline-flex h-11 items-center gap-2 rounded-xl bg-ds-accent px-5 text-base font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover"
				>
					<Plus className="h-5 w-5" />
					New QR code
				</Link>
			</div>

			<div className="overflow-hidden rounded-2xl border border-ds-border bg-ds-surface">
				<div className="border-b border-ds-border px-4 py-3 sm:px-5">
					<h2 className="text-2xl font-semibold tracking-tight">
						Managed codes
					</h2>
				</div>
				{isLoading ? (
					<div className="space-y-2 p-4">
						{[1, 2, 3].map((row) => (
							<div
								key={row}
								className="h-16 animate-pulse rounded-xl border border-ds-border bg-ds-surface2/50"
							/>
						))}
					</div>
				) : sortedCodes.length === 0 ? (
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
				) : (
					<div>
						{sortedCodes.map((code) => (
							<div
								key={code.id}
								className="border-b border-ds-border px-4 py-4 last:border-b-0 sm:px-5"
							>
								<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
									<div className="min-w-0 flex-1">
										{/*
											Short links are the tracked entrypoint. Destination remains visible as the final target.
										*/}
										<div className="text-xl font-semibold tracking-tight sm:text-2xl">
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
										<div className="mt-1 text-base text-ds-text-tertiary">
											<span className="font-medium text-ds-text-secondary">
												Primary destination:
											</span>{" "}
											<span className="[overflow-wrap:anywhere]">
												{code.destinationUrl}
											</span>
										</div>
										<div className="mt-1 text-base text-ds-text-secondary">
											{(code.destinations?.length ?? 0) > 1
												? `${code.destinations?.length ?? 0} weighted destinations`
												: "Single destination"}{" "}
											• {code.scanCount} views •{" "}
											{code.isActive ? "Active" : "Paused"}
										</div>
									</div>
									<div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
										<button
											type="button"
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
														void deleteCode.mutateAsync({ id: code.id });
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
		</div>
	);
}
