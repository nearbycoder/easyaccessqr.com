import { Download, QrCode } from "lucide-react";
import type { Options as QrStyleOptions } from "qr-code-styling/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { downloadQrAsset } from "@/lib/qr-export";
import { slugifyQrName, toAbsoluteUrl } from "@/lib/qr-links";

type QrDownloadExtension = "png" | "svg" | "jpeg" | "webp";

type QRCodeStylingInstance = {
	append: (node: HTMLElement) => void;
	download: (options?: {
		name?: string;
		extension?: QrDownloadExtension;
	}) => Promise<void>;
	getRawData?: (extension?: QrDownloadExtension) => Promise<unknown>;
};

type QRCodeStylingConstructor = new (
	options?: Partial<QrStyleOptions>,
) => QRCodeStylingInstance;

type QrPreviewModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	name: string;
	data: string;
	shortLinkPath?: string;
	publicPagePath?: string;
};

export function QrPreviewModal({
	open,
	onOpenChange,
	name,
	data,
	shortLinkPath,
	publicPagePath,
}: QrPreviewModalProps) {
	const [qrConstructor, setQrConstructor] =
		useState<QRCodeStylingConstructor | null>(null);
	const [previewContainer, setPreviewContainer] =
		useState<HTMLDivElement | null>(null);
	const [resolvedData, setResolvedData] = useState(data);
	const [isReady, setIsReady] = useState(false);
	const qrRef = useRef<QRCodeStylingInstance | null>(null);
	const previewContainerRef = useRef<HTMLDivElement | null>(null);
	const handlePreviewContainerRef = useCallback(
		(node: HTMLDivElement | null) => {
			previewContainerRef.current = node;
			setPreviewContainer((current) => (current === node ? current : node));
		},
		[],
	);

	const options = useMemo<Partial<QrStyleOptions>>(
		() => ({
			type: "svg",
			shape: "square",
			width: 420,
			height: 420,
			margin: 8,
			data: resolvedData || "https://easyaccessqr.com",
			qrOptions: {
				errorCorrectionLevel: "Q",
			},
			dotsOptions: {
				type: "rounded",
				color: "#1f2522",
			},
			cornersSquareOptions: {
				type: "extra-rounded",
				color: "#2f7f7c",
			},
			cornersDotOptions: {
				type: "dot",
				color: "#2f7f7c",
			},
			backgroundOptions: {
				color: "#ffffff",
			},
		}),
		[resolvedData],
	);

	useEffect(() => {
		let mounted = true;

		const loadConstructor = async () => {
			const module = await import("qr-code-styling");
			if (!mounted) return;
			setQrConstructor(
				() => module.default as unknown as QRCodeStylingConstructor,
			);
		};

		void loadConstructor();

		return () => {
			mounted = false;
			qrRef.current = null;
			if (previewContainerRef.current) {
				previewContainerRef.current.innerHTML = "";
			}
		};
	}, []);

	useEffect(() => {
		if (!open) {
			setResolvedData(data);
			return;
		}
		setResolvedData(data ? toAbsoluteUrl(data) : data);
	}, [data, open]);

	useEffect(() => {
		if (!open || !qrConstructor || !previewContainer) return;

		setIsReady(false);
		const instance = new qrConstructor(options);
		qrRef.current = instance;
		previewContainer.innerHTML = "";
		instance.append(previewContainer);
		setIsReady(true);

		return () => {
			qrRef.current = null;
			previewContainer.innerHTML = "";
			setIsReady(false);
		};
	}, [open, options, previewContainer, qrConstructor]);

	const handleDownload = async (extension: QrDownloadExtension) => {
		if (!qrRef.current || !isReady) {
			toast.error("QR preview is still loading.");
			return;
		}

		await downloadQrAsset({
			instance: qrRef.current,
			name: slugifyQrName(name) || "easy-access-qr",
			extension,
			backgroundColor: "#ffffff",
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="border border-ds-border bg-ds-surface p-5 sm:max-w-4xl">
				<DialogHeader className="text-left">
					<DialogTitle className="text-2xl font-bold tracking-tight">
						View QR code
					</DialogTitle>
					<DialogDescription className="text-sm text-ds-text-secondary">
						Preview this QR code and download it as PNG, SVG, or JPEG.
					</DialogDescription>
				</DialogHeader>

				<div className="mt-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
					<div className="rounded-xl border border-ds-border bg-ds-input-bg p-3">
						<div className="mb-2 flex items-center gap-2 text-ds-accent">
							<QrCode className="h-4 w-4" />
							<span className="text-sm font-semibold text-ds-text-secondary">
								{name}
							</span>
						</div>
						<div
							ref={handlePreviewContainerRef}
							className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-lg border border-ds-border bg-white p-3 [&>canvas]:h-auto [&>canvas]:max-w-full [&>svg]:h-auto [&>svg]:max-w-full"
						/>
					</div>

					<div className="space-y-3">
						<div className="rounded-xl border border-ds-border bg-ds-input-bg px-3 py-2">
							<p className="text-xs text-ds-text-tertiary">Encoded URL</p>
							<p className="mt-0.5 break-all text-sm font-semibold text-ds-fg">
								{resolvedData}
							</p>
						</div>
						{shortLinkPath ? (
							<div className="rounded-xl border border-ds-border bg-ds-input-bg px-3 py-2">
								<p className="text-xs text-ds-text-tertiary">Short link</p>
								<p className="mt-0.5 break-all text-sm font-medium text-ds-accent">
									{shortLinkPath}
								</p>
							</div>
						) : null}
						{publicPagePath ? (
							<div className="rounded-xl border border-ds-border bg-ds-input-bg px-3 py-2">
								<p className="text-xs text-ds-text-tertiary">Public QR page</p>
								<a
									href={publicPagePath}
									target="_blank"
									rel="noreferrer"
									className="mt-0.5 block break-all text-sm font-semibold text-ds-accent hover:underline"
								>
									{publicPagePath}
								</a>
							</div>
						) : null}
						{!isReady ? (
							<p className="text-xs text-ds-text-tertiary">
								Loading preview...
							</p>
						) : null}

						<div className="flex flex-wrap gap-2">
							{(["png", "svg", "jpeg"] as const).map((extension) => (
								<button
									key={extension}
									type="button"
									onClick={() => void handleDownload(extension)}
									disabled={!isReady}
									className="inline-flex h-10 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
								>
									<Download className="h-4 w-4" />
									{extension.toUpperCase()}
								</button>
							))}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
