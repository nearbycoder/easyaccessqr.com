import type QRCodeStyling from "qr-code-styling";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { copyText } from "@/lib/client-export";
import { downloadQrAsset } from "@/lib/qr-export";
import { slugifyQrName } from "@/lib/qr-links";

export function QrToolkitPreview({
	data,
	title,
	caption,
}: {
	data: string;
	title: string;
	caption: string;
}) {
	const container = useRef<HTMLDivElement>(null);
	const instance = useRef<QRCodeStyling | null>(null);
	const [readyData, setReadyData] = useState("");
	const [error, setError] = useState("");
	useEffect(() => {
		let cancelled = false;
		setReadyData("");
		setError("");
		instance.current = null;
		container.current?.replaceChildren();
		if (!data) return;
		void import("qr-code-styling")
			.then(async ({ default: QR }) => {
				const qr = new QR({
					width: 600,
					height: 600,
					type: "svg",
					data,
					margin: 48,
					qrOptions: { errorCorrectionLevel: "Q" },
					dotsOptions: { color: "#172522" },
					backgroundOptions: { color: "#ffffff" },
				});
				await qr.getRawData("svg");
				if (cancelled || !container.current) return;
				instance.current = qr;
				qr.append(container.current);
				setReadyData(data);
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
	}, [data]);
	const ready = Boolean(data && readyData === data);
	async function download(extension: "png" | "svg") {
		if (!ready || !instance.current) return;
		try {
			await downloadQrAsset({
				instance: instance.current,
				name: slugifyQrName(title) || "qr-card",
				extension,
				backgroundColor: "#ffffff",
			});
		} catch {
			toast.error("The download failed. Please try again.");
		}
	}
	return (
		<section className="space-y-4 rounded-2xl border border-ds-border bg-ds-surface p-5">
			<div
				id="toolkit-print-card"
				className="rounded-xl bg-[#ffffff] p-5 text-center text-[#172522]"
			>
				<h2 className="break-words text-2xl font-bold">{title || "Scan me"}</h2>
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
			{error ? (
				<p role="alert" className="text-sm text-red-600">
					{error}
				</p>
			) : null}
			<div className="flex flex-wrap gap-2">
				<button
					className="toolkit-button"
					disabled={!ready}
					type="button"
					onClick={() => void download("png")}
				>
					Download PNG
				</button>
				<button
					className="toolkit-button"
					disabled={!ready}
					type="button"
					onClick={() => void download("svg")}
				>
					Download SVG
				</button>
				<button
					className="toolkit-button"
					disabled={!ready}
					type="button"
					onClick={() => window.print()}
				>
					Print QR card
				</button>
				<button
					className="toolkit-button"
					disabled={!ready}
					type="button"
					onClick={() =>
						void copyText(data)
							.then(() => toast.success("QR content copied"))
							.catch(() => toast.error("Unable to copy content."))
					}
				>
					Copy content
				</button>
			</div>
			<details>
				<summary className="cursor-pointer text-sm font-semibold">
					Encoded content
				</summary>
				<pre
					className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-xs"
					data-testid="toolkit-payload"
				>
					{data}
				</pre>
			</details>
		</section>
	);
}
