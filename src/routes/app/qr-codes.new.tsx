import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
	QrDesignStudio,
	type QrDesignStudioSubmit,
} from "@/components/qr/qr-design-studio";
import { useTRPC } from "@/integrations/trpc/react";
import { slugifyQrName } from "@/lib/qr-links";
import { httpUrl } from "@/lib/qr-toolkit";

export const Route = createFileRoute("/app/qr-codes/new")({
	component: NewQrCodePage,
	validateSearch: (
		search: Record<string, unknown>,
	): { destination?: string; name?: string } => {
		let destination = "";
		if (
			typeof search.destination === "string" &&
			search.destination.length <= 1600
		) {
			try {
				destination = httpUrl(search.destination).toString();
			} catch {
				/* Invalid prefill is ignored. */
			}
		}
		const name =
			typeof search.name === "string" ? search.name.slice(0, 100) : "";
		return {
			...(destination ? { destination } : {}),
			...(name ? { name } : {}),
		};
	},
});

function NewQrCodePage() {
	const prefill = Route.useSearch();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const navigate = Route.useNavigate();

	const createCode = useMutation(
		trpc.qrCodes.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
				toast.success("QR code created");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create QR code.");
			},
		}),
	);

	const handleSubmit = async (payload: QrDesignStudioSubmit) => {
		const preferredSlug = slugifyQrName(payload.name);
		const created = await createCode.mutateAsync({
			name: payload.name,
			destinationUrl: payload.destinationUrl,
			destinations: payload.destinations,
			isPublic: payload.isPublic,
			tags: payload.tags,
			slug: preferredSlug || undefined,
		});
		if (created?.slug && preferredSlug && created.slug !== preferredSlug) {
			toast.info(`Slug updated to ${created.slug} to keep it unique.`);
		}
		if (created?.id) {
			await navigate({
				to: "/app/qr-codes/$qrCodeId/edit",
				params: { qrCodeId: String(created.id) },
			});
			return;
		}
		await navigate({ to: "/app/qr-codes" });
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
				<h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
					Create QR code
				</h1>
				<p className="mt-1 text-base text-ds-text-secondary">
					Build a styled code and save it to your organization.
				</p>
			</div>

			<QrDesignStudio
				mode="create"
				initialName={prefill.name}
				initialDestinationUrl={prefill.destination}
				submitPending={createCode.isPending}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
