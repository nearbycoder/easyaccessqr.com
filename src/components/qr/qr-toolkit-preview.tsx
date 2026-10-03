import type QRCodeStyling from "qr-code-styling";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { copyText } from "@/lib/client-export";
import { downloadQrAsset } from "@/lib/qr-export";
import { slugifyQrName } from "@/lib/qr-links";
import {
	defaultToolkitDesign,
	designContrast,
	type ToolkitDesign,
} from "@/lib/qr-workspace";

export function QrToolkitPreview({
	data,
	title,
	caption,
	design = defaultToolkitDesign,
}: {
	data: string;
	title: string;
	caption: string;
	design?: ToolkitDesign;
}) {
	const container = useRef<HTMLDivElement>(null);
	const instance = useRef<QRCodeStyling | null>(null);
	const [readyData, setReadyData] = useState("");
	const [error, setError] = useState("");
	const [exporting, setExporting] = useState(false);
	const safe = designContrast(design).safe;
	const renderKey = JSON.stringify([
		data,
		design.size,
		design.foreground,
		design.background,
		design.dots,
	]);
	useEffect(() => {
		let cancelled = false;
		setReadyData("");
		setError("");
		instance.current = null;
		container.current?.replaceChildren();
		if (!data || !safe) return;
		void import("qr-code-styling")
			.then(async ({ default: QR }) => {
				const qr = new QR({
					width: design.size,
					height: design.size,
					type: "svg",
					data,
					margin: Math.round(design.size * 0.08),
					qrOptions: { errorCorrectionLevel: "Q" },
					dotsOptions: { color: design.foreground, type: design.dots },
					backgroundOptions: { color: design.background },
				});
				await qr.getRawData("svg");
				if (cancelled || !container.current) return;
				instance.current = qr;
				qr.append(container.current);
				setReadyData(renderKey);
			})
			.catch(() => {
				if (!cancelled)
					setError(
						"Unable to render this QR code. Try shorter content or reload the page.",
					);
			});
		return () => {
			cancelled = true;
		};
	}, [
		data,
		safe,
		design.size,
		design.foreground,
		design.background,
		design.dots,
		renderKey,
	]);
	const ready = Boolean(data && readyData === renderKey && safe && !exporting);
	async function download(extension: "png" | "svg" | "jpeg" | "webp") {
		if (!ready || !instance.current) return;
		setExporting(true);
		try {
			await downloadQrAsset({
				instance: instance.current,
				name: slugifyQrName(design.filename || title) || "qr-card",
				extension,
				backgroundColor: design.background,
			});
		} catch {
			toast.error("The download failed. Please try again.");
		} finally {
			setExporting(false);
		}
	}
	return (
		<Card className="min-w-0 lg:sticky lg:top-0">
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<CardTitle>Live preview</CardTitle>
					<Badge variant="secondary">{design.size} px</Badge>
				</div>
				<CardDescription>
					Your print-ready card, updated as you edit.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<div
					id="toolkit-print-card"
					className="rounded-lg border p-5 text-center shadow-sm"
					style={{
						backgroundColor: design.background,
						color: design.foreground,
					}}
				>
					<h2 className="break-words text-2xl font-bold">
						{title || "Scan me"}
					</h2>
					<div
						role="img"
						aria-label="QR code preview"
						ref={container}
						className="mx-auto my-4 aspect-square w-full max-w-[320px] [&>svg]:h-full [&>svg]:w-full"
					/>
					<p className="whitespace-pre-wrap break-words text-sm">
						{caption || "Point your camera at the QR code"}
					</p>
				</div>
				{error || !safe ? (
					<Alert variant="destructive">
						<AlertDescription>
							{error ||
								"Increase contrast and use dark ink on a light background to export."}
						</AlertDescription>
					</Alert>
				) : null}
				<div className="grid grid-cols-2 gap-2">
					<Button
						disabled={!ready}
						type="button"
						onClick={() => void download("png")}
					>
						Download PNG
					</Button>
					<Button
						variant="outline"
						disabled={!ready}
						type="button"
						onClick={() => void download("svg")}
					>
						Download SVG
					</Button>
					{(["jpeg", "webp"] as const).map((extension) => (
						<Button
							key={extension}
							variant="outline"
							disabled={!ready}
							onClick={() => void download(extension)}
						>
							Download {extension.toUpperCase()}
						</Button>
					))}
					<Button
						variant="outline"
						disabled={!ready}
						type="button"
						onClick={() => window.print()}
					>
						Print QR card
					</Button>
					<Button
						variant="outline"
						disabled={!ready}
						type="button"
						onClick={() =>
							void copyText(data)
								.then(() => toast.success("QR content copied"))
								.catch(() => toast.error("Unable to copy content."))
						}
					>
						Copy content
					</Button>
				</div>
				<details>
					<summary className="cursor-pointer text-xs font-medium text-ds-text-tertiary">
						Encoded content
					</summary>
					<pre
						className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs"
						data-testid="toolkit-payload"
					>
						{data}
					</pre>
				</details>
			</CardContent>
		</Card>
	);
}
