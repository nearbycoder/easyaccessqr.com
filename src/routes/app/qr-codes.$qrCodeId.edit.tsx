import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	QrDesignStudio,
	type QrDesignStudioSubmit,
} from "@/components/qr/qr-design-studio";
import { useTRPC } from "@/integrations/trpc/react";
import { authClient } from "@/lib/auth-client";
import {
	buildQrPublicPreviewPath,
	buildQrShortPath,
	toAbsoluteUrl,
} from "@/lib/qr-links";

export const Route = createFileRoute("/app/qr-codes/$qrCodeId/edit")({
	component: EditQrCodePage,
});

function EditQrCodePage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { qrCodeId } = Route.useParams();
	const parsedCodeId = Number(qrCodeId);
	const { data: session } = authClient.useSession();
	const { data: organizationsData } = authClient.useListOrganizations();

	const { data: qrCodes, isLoading } = useQuery(
		trpc.qrCodes.list.queryOptions({ includeInactive: true }),
	);

	const updateCode = useMutation(
		trpc.qrCodes.update.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
				toast.success("QR code updated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update QR code.");
			},
		}),
	);

	const targetCode = useMemo(
		() => (qrCodes ?? []).find((code) => code.id === parsedCodeId),
		[qrCodes, parsedCodeId],
	);
	const activeOrganizationSlug = useMemo(() => {
		const activeOrganizationId = session?.session.activeOrganizationId ?? "";
		if (!activeOrganizationId) return "";
		return (
			organizationsData?.find(
				(organization) => organization.id === activeOrganizationId,
			)?.slug ?? ""
		);
	}, [organizationsData, session?.session.activeOrganizationId]);
	const trackingUrl = useMemo(() => {
		if (!targetCode || !activeOrganizationSlug) return "";
		return toAbsoluteUrl(
			buildQrShortPath(activeOrganizationSlug, targetCode.slug),
		);
	}, [activeOrganizationSlug, targetCode]);
	const publicPreviewUrl = useMemo(() => {
		if (!targetCode || !activeOrganizationSlug || !targetCode.isPublic)
			return "";
		return toAbsoluteUrl(
			buildQrPublicPreviewPath(activeOrganizationSlug, targetCode.slug),
		);
	}, [activeOrganizationSlug, targetCode]);

	if (!Number.isInteger(parsedCodeId) || parsedCodeId <= 0) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				<p className="text-sm text-red-600">The QR code id is invalid.</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				<div className="h-12 w-[220px] animate-pulse rounded-xl bg-ds-surface2/60" />
				<div className="mt-4 h-[620px] animate-pulse rounded-2xl bg-ds-surface2/60" />
			</div>
		);
	}

	if (!targetCode) {
		return (
			<div className="mx-auto w-full max-w-[1320px]">
				<Link
					to="/app/qr-codes"
					className="inline-flex items-center gap-1 text-sm font-semibold text-ds-text-secondary transition-colors hover:text-ds-accent"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to QR codes
				</Link>
				<p className="mt-3 text-sm text-ds-text-secondary">
					This QR code could not be found or may have been removed.
				</p>
			</div>
		);
	}

	const handleSubmit = async (payload: QrDesignStudioSubmit) => {
		await updateCode.mutateAsync({
			id: targetCode.id,
			name: payload.name,
			destinationUrl: payload.destinationUrl,
			destinations: payload.destinations,
			isPublic: payload.isPublic,
			tags: payload.tags,
		});
	};

	return (
		<div className="mx-auto w-full max-w-[1320px]">
			<div className="mb-6">
				<Link
					to="/app/qr-codes"
					className="inline-flex items-center gap-1 text-sm font-semibold text-ds-text-secondary transition-colors hover:text-ds-accent"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to QR codes
				</Link>
				<h1 className="mt-2 text-2xl font-extrabold tracking-tighter sm:text-3xl">
					Edit QR code
				</h1>
				<p className="mt-1 text-base text-ds-text-secondary">
					Update destination and style preview for {targetCode.name}.
				</p>
				{trackingUrl ? (
					<p className="mt-1 text-sm text-ds-accent">
						Tracked short link:{" "}
						<span className="font-semibold">{trackingUrl}</span>
					</p>
				) : null}
				{publicPreviewUrl ? (
					<p className="mt-1 text-sm text-ds-text-secondary">
						Public page:{" "}
						<a
							href={publicPreviewUrl}
							target="_blank"
							rel="noreferrer"
							className="font-semibold text-ds-accent hover:underline"
						>
							{publicPreviewUrl}
						</a>
					</p>
				) : null}
			</div>

			<QrDesignStudio
				mode="edit"
				initialName={targetCode.name}
				initialDestinationUrl={targetCode.destinationUrl}
				initialIsPublic={targetCode.isPublic}
				initialTags={targetCode.tags}
				initialDestinations={targetCode.destinations}
				trackingUrl={trackingUrl}
				submitPending={updateCode.isPending}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
