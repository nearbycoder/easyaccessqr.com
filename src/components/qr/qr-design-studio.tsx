import {
	Download,
	Link2,
	Paintbrush,
	Percent,
	Plus,
	QrCode,
	Settings2,
	ShieldCheck,
	Trash2,
	WandSparkles,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
	CornerDotType,
	CornerSquareType,
	DotType,
	ErrorCorrectionLevel,
	Options as QrStyleOptions,
	ShapeType,
} from "qr-code-styling/lib/types";
import {
	MAX_QR_DESTINATIONS,
	isHttpDestinationUrl,
	normalizeQrDestinations,
} from "@/lib/qr-destinations";

export type DesignerState = {
	size: number;
	margin: number;
	shape: ShapeType;
	errorCorrectionLevel: ErrorCorrectionLevel;
	dotStyle: DotType;
	cornerSquareStyle: CornerSquareType;
	cornerDotStyle: CornerDotType;
	dotColor: string;
	cornerSquareColor: string;
	cornerDotColor: string;
	backgroundColor: string;
	logoUrl: string;
	logoSize: number;
	hideBackgroundDots: boolean;
};

export type QrDesignStudioSubmit = {
	name: string;
	destinationUrl: string;
	destinations: Array<{
		id?: string;
		label?: string;
		url: string;
		weight: number;
	}>;
	designer: DesignerState;
};

type QrDesignStudioProps = {
	mode: "create" | "edit";
	initialName?: string;
	initialDestinationUrl?: string;
	initialDestinations?: Array<{
		id?: string;
		label?: string | null;
		url: string;
		weight: number;
	}>;
	trackingUrl?: string;
	submitPending?: boolean;
	onSubmit: (payload: QrDesignStudioSubmit) => Promise<void> | void;
};

type DestinationDraft = {
	id: string;
	label: string;
	url: string;
	weight: number;
};

type QRCodeStylingInstance = {
	append: (node: HTMLElement) => void;
	download: (options?: {
		name?: string;
		extension?: "png" | "svg" | "jpeg" | "webp";
	}) => Promise<void>;
};

type QRCodeStylingConstructor = new (
	options?: Partial<QrStyleOptions>,
) => QRCodeStylingInstance;

const DOT_STYLE_OPTIONS: Array<{ value: DotType; label: string }> = [
	{ value: "square", label: "Square" },
	{ value: "rounded", label: "Rounded" },
];

const CORNER_SQUARE_OPTIONS: Array<{ value: CornerSquareType; label: string }> =
	[
		{ value: "square", label: "Square" },
		{ value: "rounded", label: "Rounded" },
		{ value: "extra-rounded", label: "Extra rounded" },
	];

const CORNER_DOT_OPTIONS: Array<{ value: CornerDotType; label: string }> = [
	{ value: "dot", label: "Dot" },
	{ value: "square", label: "Square" },
	{ value: "rounded", label: "Rounded" },
];

const ERROR_LEVEL_OPTIONS: ErrorCorrectionLevel[] = ["Q", "H"];

const MIN_QUIET_ZONE = 8;
const MAX_QUIET_ZONE = 30;
const MIN_PREVIEW_SIZE = 300;
const MAX_PREVIEW_SIZE = 520;
const MAX_LOGO_SIZE = 0.22;
const MIN_CONTRAST_RATIO = 4.5;

export const DEFAULT_DESIGNER: DesignerState = {
	size: 340,
	margin: MIN_QUIET_ZONE,
	shape: "square",
	errorCorrectionLevel: "Q",
	dotStyle: "rounded",
	cornerSquareStyle: "extra-rounded",
	cornerDotStyle: "dot",
	dotColor: "#1f2522",
	cornerSquareColor: "#2f7f7c",
	cornerDotColor: "#2f7f7c",
	backgroundColor: "#ffffff",
	logoUrl: "",
	logoSize: 0.2,
	hideBackgroundDots: true,
};

export function QrDesignStudio({
	mode,
	initialName = "",
	initialDestinationUrl = "",
	initialDestinations,
	trackingUrl,
	submitPending = false,
	onSubmit,
}: QrDesignStudioProps) {
	const [name, setName] = useState(initialName);
	const [destinations, setDestinations] = useState<DestinationDraft[]>(() =>
		createInitialDestinationDrafts(initialDestinations, initialDestinationUrl),
	);
	const [designer, setDesigner] = useState<DesignerState>(DEFAULT_DESIGNER);
	const normalizedDestinations = useMemo(
		() =>
			normalizeQrDestinations(
				destinations.map((destination) => ({
					id: destination.id,
					label: destination.label,
					url: destination.url,
					weight: destination.weight,
				})),
			),
		[destinations],
	);
	const destinationWeightTotal = destinations.reduce(
		(sum, destination) => sum + normalizeWeightInput(destination.weight),
		0,
	);
	const isDestinationConfigValid =
		normalizedDestinations.length > 0 &&
		normalizedDestinations.length === destinations.length &&
		destinationWeightTotal === 100;
	const primaryDestinationUrl = normalizedDestinations[0]?.url ?? "";
	const previewUrl = primaryDestinationUrl || "https://easyaccessqr.com";
	const encodedQrUrl = trackingUrl?.trim() || previewUrl;
	const canExport = Boolean(trackingUrl?.trim());
	const updateDesigner = (
		updater: (current: DesignerState) => DesignerState,
	) => {
		setDesigner((current) => {
			const next = coerceIphoneSafeDesigner(updater(current), encodedQrUrl);
			return areDesignerStatesEqual(current, next) ? current : next;
		});
	};
	const compatibility = useMemo(
		() => getIphoneCompatibilityReport(designer, encodedQrUrl),
		[designer, encodedQrUrl],
	);
	const submitLabel = mode === "create" ? "Create" : "Save changes";
	const submitPendingLabel = mode === "create" ? "Creating..." : "Saving...";

	useEffect(() => {
		setName(initialName);
	}, [initialName]);

	useEffect(() => {
		setDestinations(
			createInitialDestinationDrafts(
				initialDestinations,
				initialDestinationUrl,
			),
		);
	}, [initialDestinationUrl, initialDestinations]);

	useEffect(() => {
		setDesigner((current) => {
			const next = coerceIphoneSafeDesigner(current, encodedQrUrl);
			return areDesignerStatesEqual(current, next) ? current : next;
		});
	}, [encodedQrUrl]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!isDestinationConfigValid) {
			toast.error(
				"Destination routing must include valid URLs and total exactly 100 percent.",
			);
			return;
		}
		if (!compatibility.isCompatible) {
			toast.error("Adjust style settings to pass iPhone scan compatibility.");
			return;
		}

		await onSubmit({
			name: name.trim(),
			destinationUrl: primaryDestinationUrl,
			destinations: normalizedDestinations.map((destination) => ({
				id: destination.id,
				label: destination.label ?? undefined,
				url: destination.url,
				weight: destination.weight,
			})),
			designer,
		});
	};

	return (
		<div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
			<form
				onSubmit={(event) => void handleSubmit(event)}
				className="min-w-0 rounded-2xl border border-ds-border bg-ds-surface p-4 sm:p-6"
			>
				<div className="mb-4 flex items-center gap-2 text-ds-accent">
					<QrCode className="h-4 w-4" />
					<span className="text-2xl font-semibold">QR design studio</span>
				</div>

				<div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
					<input
						required
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Campaign landing"
						className="h-12 min-w-0 rounded-xl border border-ds-border bg-ds-input-bg px-4 text-base text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
					/>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() =>
								setDestinations((current) => {
									if (current.length >= MAX_QR_DESTINATIONS) return current;
									const next = [
										...current,
										{
											id: getNextDestinationId(current),
											label: `Variant ${String.fromCharCode(65 + current.length)}`,
											url: "",
											weight: 1,
										},
									];
									return rebalanceDestinationDrafts(next);
								})
							}
							disabled={destinations.length >= MAX_QR_DESTINATIONS}
							className="inline-flex h-12 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-4 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
						>
							<Plus className="h-4 w-4" />
							Add destination
						</button>
						<button
							type="button"
							onClick={() =>
								setDestinations((current) =>
									rebalanceDestinationDrafts(current),
								)
							}
							className="inline-flex h-12 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-4 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
						>
							<Percent className="h-4 w-4" />
							Normalize to 100 percent
						</button>
					</div>
				</div>

				<div className="mt-4 rounded-xl border border-ds-border bg-ds-input-bg p-3">
					<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ds-fg">
						<Link2 className="h-4 w-4 text-ds-accent" />
						Destination routing
					</div>
					<div className="space-y-2">
						{destinations.map((destination, index) => (
							<div
								key={destination.id}
								className="grid grid-cols-1 gap-2 rounded-xl border border-ds-border bg-ds-surface2/45 p-2 md:grid-cols-[minmax(0,140px)_minmax(0,1fr)_110px_auto]"
							>
								<input
									value={destination.label}
									onChange={(event) =>
										setDestinations((current) =>
											current.map((row) =>
												row.id === destination.id
													? { ...row, label: event.target.value }
													: row,
											),
										)
									}
									placeholder={`Variant ${String.fromCharCode(65 + index)}`}
									className="h-10 min-w-0 rounded-lg border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
								/>
								<input
									required={index === 0}
									type="url"
									value={destination.url}
									onChange={(event) =>
										setDestinations((current) =>
											current.map((row) =>
												row.id === destination.id
													? { ...row, url: event.target.value }
													: row,
											),
										)
									}
									placeholder="https://example.com"
									className="h-10 min-w-0 rounded-lg border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
								/>
								<div className="flex items-center gap-1 overflow-hidden rounded-lg border border-ds-border bg-ds-input-bg px-2">
									<input
										type="number"
										min={1}
										max={100}
										value={destination.weight}
										onChange={(event) => {
											const nextWeight = normalizeWeightInput(
												Number(event.target.value),
											);
											setDestinations((current) =>
												current.map((row) =>
													row.id === destination.id
														? { ...row, weight: nextWeight }
														: row,
												),
											);
										}}
										className="h-9 min-w-0 w-full appearance-none border-0 bg-transparent text-right text-sm text-ds-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
									/>
									<span className="text-xs text-ds-text-tertiary">%</span>
								</div>
								<button
									type="button"
									onClick={() =>
										setDestinations((current) => {
											if (current.length <= 1) return current;
											const next = current.filter(
												(row) => row.id !== destination.id,
											);
											return rebalanceDestinationDrafts(next);
										})
									}
									disabled={destinations.length <= 1}
									className="inline-flex h-10 items-center justify-center rounded-lg border border-ds-border bg-ds-input-bg px-2 text-ds-text-secondary transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-60"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
					<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
						<span
							className={
								destinationWeightTotal === 100
									? "font-semibold text-emerald-700 dark:text-emerald-300"
									: "font-semibold text-amber-700 dark:text-amber-300"
							}
						>
							Total allocation: {destinationWeightTotal}%
						</span>
						{!isDestinationConfigValid ? (
							<span className="text-ds-text-tertiary">
								Use valid HTTP(S) URLs and make allocations total 100%.
							</span>
						) : null}
					</div>
				</div>

				<div className="mt-4 rounded-xl border border-ds-border bg-ds-input-bg p-3">
					<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ds-fg">
						<Paintbrush className="h-4 w-4 text-ds-accent" />
						Style controls
					</div>
					<div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
						<SelectField
							label="Dot style"
							value={designer.dotStyle}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									dotStyle: value as DotType,
								}))
							}
							options={DOT_STYLE_OPTIONS}
						/>
						<SelectField
							label="Shape"
							value={designer.shape}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									shape: value as ShapeType,
								}))
							}
							options={[{ value: "square", label: "Square" }]}
						/>
						<SelectField
							label="Corner outer"
							value={designer.cornerSquareStyle}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									cornerSquareStyle: value as CornerSquareType,
								}))
							}
							options={CORNER_SQUARE_OPTIONS}
						/>
						<SelectField
							label="Corner inner"
							value={designer.cornerDotStyle}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									cornerDotStyle: value as CornerDotType,
								}))
							}
							options={CORNER_DOT_OPTIONS}
						/>
						<SelectField
							label="Error correction"
							value={designer.errorCorrectionLevel}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									errorCorrectionLevel: value as ErrorCorrectionLevel,
								}))
							}
							options={ERROR_LEVEL_OPTIONS.map((option) => ({
								value: option,
								label: option,
							}))}
						/>
						<div className="rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-2">
							<div className="text-xs text-ds-text-tertiary">Quiet zone</div>
							<input
								type="range"
								min={MIN_QUIET_ZONE}
								max={MAX_QUIET_ZONE}
								value={designer.margin}
								onChange={(event) =>
									updateDesigner((current) => ({
										...current,
										margin: clampNumber(
											Number(event.target.value),
											MIN_QUIET_ZONE,
											MAX_QUIET_ZONE,
										),
									}))
								}
								className="mt-2 w-full"
							/>
							<div className="mt-1 text-xs font-semibold text-ds-fg">
								{designer.margin}px
							</div>
						</div>
						<div className="rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-2">
							<div className="text-xs text-ds-text-tertiary">Preview size</div>
							<input
								type="range"
								min={MIN_PREVIEW_SIZE}
								max={MAX_PREVIEW_SIZE}
								step={10}
								value={designer.size}
								onChange={(event) =>
									updateDesigner((current) => ({
										...current,
										size: clampNumber(
											Number(event.target.value),
											MIN_PREVIEW_SIZE,
											MAX_PREVIEW_SIZE,
										),
									}))
								}
								className="mt-2 w-full"
							/>
							<div className="mt-1 text-xs font-semibold text-ds-fg">
								{designer.size}px
							</div>
						</div>
						<ColorField
							label="Dots"
							value={designer.dotColor}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									dotColor: value,
								}))
							}
						/>
						<ColorField
							label="Corner outer"
							value={designer.cornerSquareColor}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									cornerSquareColor: value,
								}))
							}
						/>
						<ColorField
							label="Corner inner"
							value={designer.cornerDotColor}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									cornerDotColor: value,
								}))
							}
						/>
						<ColorField
							label="Background"
							value={designer.backgroundColor}
							onChange={(value) =>
								updateDesigner((current) => ({
									...current,
									backgroundColor: value,
								}))
							}
						/>
					</div>

					<div className="mt-3 rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-3">
						<div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ds-fg">
							<Settings2 className="h-3.5 w-3.5 text-ds-accent" />
							Logo
						</div>
						<div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_auto]">
							<input
								value={designer.logoUrl}
								onChange={(event) =>
									updateDesigner((current) => ({
										...current,
										logoUrl: event.target.value,
									}))
								}
								placeholder="https://example.com/logo.png"
								className="h-10 min-w-0 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
							/>
							<label className="inline-flex items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-3 py-2 text-sm leading-tight text-ds-fg">
								<input
									type="checkbox"
									checked={designer.hideBackgroundDots}
									onChange={(event) =>
										updateDesigner((current) => ({
											...current,
											hideBackgroundDots: event.target.checked,
										}))
									}
									className="h-4 w-4"
								/>
								Mask behind logo
							</label>
						</div>
						<div className="mt-2">
							<div className="text-xs text-ds-text-tertiary">Logo size</div>
							<input
								type="range"
								min={10}
								max={Math.round(MAX_LOGO_SIZE * 100)}
								step={1}
								value={Math.round(designer.logoSize * 100)}
								onChange={(event) =>
									updateDesigner((current) => ({
										...current,
										logoSize: clampNumber(
											Number(event.target.value) / 100,
											0.1,
											MAX_LOGO_SIZE,
										),
									}))
								}
								className="mt-2 w-full"
							/>
							<div className="mt-1 text-xs font-semibold text-ds-fg">
								{Math.round(designer.logoSize * 100)}%
							</div>
						</div>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<button
						type="submit"
						disabled={
							submitPending ||
							!isDestinationConfigValid ||
							!compatibility.isCompatible
						}
						className="inline-flex h-11 items-center gap-2 rounded-xl bg-ds-accent px-6 text-lg font-semibold text-ds-accent-fg transition-colors hover:bg-ds-accent-hover disabled:opacity-60"
					>
						<Plus className="h-5 w-5" />
						{submitPending ? submitPendingLabel : submitLabel}
					</button>
					<button
						type="button"
						onClick={() =>
							setDesigner(
								coerceIphoneSafeDesigner(DEFAULT_DESIGNER, encodedQrUrl),
							)
						}
						className="inline-flex h-11 items-center gap-2 rounded-xl border border-ds-border bg-ds-input-bg px-4 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent"
					>
						<WandSparkles className="h-4 w-4" />
						Reset style
					</button>
				</div>

				<div className="mt-4 rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
					<div className="flex items-center gap-2 font-semibold">
						<ShieldCheck className="h-4 w-4" />
						iPhone-safe constraints are enforced automatically.
					</div>
					<p className="mt-1 text-xs">
						Unsafe combinations are auto-corrected while you edit.
					</p>
					{!canExport ? (
						<p className="mt-1 text-xs">
							Save this code first to generate a tracked short link for export.
						</p>
					) : null}
				</div>
			</form>

			<QrDesignerPreview
				data={encodedQrUrl}
				name={name || "easy-access-qr"}
				hasValidDestination={Boolean(primaryDestinationUrl)}
				designer={designer}
				compatibility={compatibility}
				canExport={canExport}
			/>
		</div>
	);
}

function QrDesignerPreview({
	data,
	name,
	designer,
	hasValidDestination,
	compatibility,
	canExport,
}: {
	data: string;
	name: string;
	designer: DesignerState;
	hasValidDestination: boolean;
	compatibility: IPhoneCompatibilityReport;
	canExport: boolean;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const qrRef = useRef<QRCodeStylingInstance | null>(null);
	const [qrConstructor, setQrConstructor] =
		useState<QRCodeStylingConstructor | null>(null);
	const [isReady, setIsReady] = useState(false);

	const options = useMemo<Partial<QrStyleOptions>>(() => {
		const logoUrl = isHttpUrl(designer.logoUrl)
			? designer.logoUrl.trim()
			: undefined;
		return {
			type: "svg",
			shape: designer.shape,
			width: designer.size,
			height: designer.size,
			margin: designer.margin,
			data,
			image: logoUrl,
			qrOptions: {
				errorCorrectionLevel: designer.errorCorrectionLevel,
			},
			imageOptions: {
				hideBackgroundDots: designer.hideBackgroundDots,
				imageSize: designer.logoSize,
				margin: 4,
				crossOrigin: "anonymous",
			},
			dotsOptions: {
				type: designer.dotStyle,
				color: designer.dotColor,
			},
			cornersSquareOptions: {
				type: designer.cornerSquareStyle,
				color: designer.cornerSquareColor,
			},
			cornersDotOptions: {
				type: designer.cornerDotStyle,
				color: designer.cornerDotColor,
			},
			backgroundOptions: {
				color: designer.backgroundColor,
			},
		};
	}, [data, designer]);

	useEffect(() => {
		let mounted = true;

		const mount = async () => {
			const module = await import("qr-code-styling");
			if (!mounted) return;
			setQrConstructor(
				() => module.default as unknown as QRCodeStylingConstructor,
			);
		};

		void mount();

		return () => {
			mounted = false;
			qrRef.current = null;
			if (containerRef.current) {
				containerRef.current.innerHTML = "";
			}
		};
	}, []);

	useEffect(() => {
		if (!qrConstructor || !containerRef.current) return;

		setIsReady(false);
		const instance = new qrConstructor(options);
		qrRef.current = instance;
		containerRef.current.innerHTML = "";
		instance.append(containerRef.current);
		setIsReady(true);
	}, [options, qrConstructor]);

	const handleDownload = async (extension: "png" | "svg" | "jpeg") => {
		if (!canExport) {
			toast.error("Save QR code first to export a tracked short link.");
			return;
		}
		if (!compatibility.isCompatible) {
			toast.error("Fix compatibility issues before downloading.");
			return;
		}
		if (!qrRef.current) return;
		await qrRef.current.download({
			name: slugify(name) || "easy-access-qr",
			extension,
		});
	};

	return (
		<aside className="h-fit min-w-0 rounded-2xl border border-ds-border bg-ds-surface p-4 sm:p-5 2xl:sticky 2xl:top-20">
			<div className="mb-3 flex items-center gap-2 text-ds-accent">
				<QrCode className="h-4 w-4" />
				<h2 className="text-xl font-semibold tracking-tight">
					Live QR preview
				</h2>
			</div>

			<div className="rounded-xl border border-ds-border bg-ds-input-bg p-3">
				<div
					ref={containerRef}
					className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-lg sm:min-h-[280px] [&>canvas]:h-auto [&>canvas]:max-w-full [&>svg]:h-auto [&>svg]:max-w-full"
				/>
				{!isReady ? (
					<p className="mt-2 text-sm text-ds-text-tertiary">
						Loading designer...
					</p>
				) : null}
			</div>

			<div className="mt-3 space-y-2 text-sm">
				<div className="rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-2">
					<p className="text-xs text-ds-text-tertiary">Encoded URL</p>
					<p className="mt-0.5 break-all font-medium text-ds-fg">{data}</p>
				</div>
				{!hasValidDestination ? (
					<p className="text-xs text-amber-700">
						Enter a valid destination URL to update preview data.
					</p>
				) : null}
				{!compatibility.isCompatible ? (
					<p className="text-xs text-amber-700">
						Adjust style controls before exporting for reliable iPhone scans.
					</p>
				) : null}
				{!canExport ? (
					<p className="text-xs text-amber-700">
						Create this QR code first so exports use your tracked short link.
					</p>
				) : null}
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => void handleDownload("png")}
					disabled={!isReady || !compatibility.isCompatible || !canExport}
					className="inline-flex h-10 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
				>
					<Download className="h-4 w-4" />
					PNG
				</button>
				<button
					type="button"
					onClick={() => void handleDownload("svg")}
					disabled={!isReady || !compatibility.isCompatible || !canExport}
					className="inline-flex h-10 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
				>
					<Download className="h-4 w-4" />
					SVG
				</button>
				<button
					type="button"
					onClick={() => void handleDownload("jpeg")}
					disabled={!isReady || !compatibility.isCompatible || !canExport}
					className="inline-flex h-10 items-center gap-1 rounded-xl border border-ds-border bg-ds-input-bg px-3 text-sm font-semibold text-ds-text-secondary transition-colors hover:border-ds-accent hover:text-ds-accent disabled:opacity-60"
				>
					<Download className="h-4 w-4" />
					JPEG
				</button>
			</div>
		</aside>
	);
}

function createInitialDestinationDrafts(
	initialDestinations: QrDesignStudioProps["initialDestinations"],
	initialDestinationUrl: string,
) {
	const normalized = normalizeQrDestinations(
		initialDestinations ?? [],
		initialDestinationUrl,
	);
	if (normalized.length > 0) {
		return normalized.map((destination, index) => ({
			id: destination.id || createDestinationId(index),
			label: destination.label ?? "",
			url: destination.url,
			weight: destination.weight,
		}));
	}

	return [
		{
			id: createDestinationId(0),
			label: "Primary",
			url: isHttpDestinationUrl(initialDestinationUrl)
				? initialDestinationUrl.trim()
				: "",
			weight: 100,
		},
	];
}

function createDestinationId(index: number) {
	return `dest-${index + 1}`;
}

function getNextDestinationId(drafts: DestinationDraft[]) {
	const max = drafts.reduce((currentMax, draft) => {
		const match = /^dest-(\d+)$/.exec(draft.id.trim());
		const numeric = match?.[1] ? Number(match[1]) : 0;
		return Number.isFinite(numeric)
			? Math.max(currentMax, numeric)
			: currentMax;
	}, 0);
	return createDestinationId(max);
}

function normalizeWeightInput(rawWeight: number) {
	if (!Number.isFinite(rawWeight)) return 1;
	return Math.max(1, Math.min(100, Math.round(rawWeight)));
}

function rebalanceDestinationDrafts(drafts: DestinationDraft[]) {
	if (drafts.length === 0) return drafts;
	const normalizedWeights = normalizeIntegerPercentWeights(
		drafts.map((draft) => normalizeWeightInput(draft.weight)),
	);
	return drafts.map((draft, index) => ({
		...draft,
		weight: normalizedWeights[index] ?? 0,
	}));
}

function normalizeIntegerPercentWeights(weights: number[]) {
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	if (weights.length === 0) return [];
	if (total <= 0) {
		const even = Math.floor(100 / weights.length);
		let remainder = 100 - even * weights.length;
		return weights.map(() => {
			if (remainder > 0) {
				remainder -= 1;
				return even + 1;
			}
			return even;
		});
	}

	const scaled = weights.map((weight) => (weight / total) * 100);
	const floors = scaled.map((value) => Math.floor(value));
	let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);
	const rankedIndices = scaled
		.map((value, index) => ({ index, decimal: value - floors[index] }))
		.sort((a, b) => b.decimal - a.decimal || a.index - b.index);

	while (remainder > 0 && rankedIndices.length > 0) {
		for (const ranked of rankedIndices) {
			if (remainder <= 0) break;
			floors[ranked.index] += 1;
			remainder -= 1;
		}
	}

	return floors;
}

function SelectField({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string; label: string }>;
}) {
	return (
		<div className="min-w-0 rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-2">
			<div className="mb-1 text-xs text-ds-text-tertiary">{label}</div>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-9 min-w-0 w-full rounded-lg border border-ds-border bg-ds-input-bg px-2 text-sm text-ds-fg outline-none transition-colors focus:border-ds-accent"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</div>
	);
}

function ColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const safeColorValue = isHexColor(value) ? value : "#000000";

	return (
		<div className="min-w-0 rounded-xl border border-ds-border bg-ds-surface2/45 px-3 py-2">
			<div className="mb-1 text-xs text-ds-text-tertiary">{label}</div>
			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
				<input
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className="h-9 min-w-0 w-full rounded-lg border border-ds-border bg-ds-input-bg px-2 text-sm text-ds-fg outline-none transition-colors placeholder:text-ds-text-tertiary focus:border-ds-accent"
				/>
				<input
					type="color"
					value={safeColorValue}
					onChange={(event) => onChange(event.target.value)}
					className="h-9 w-11 cursor-pointer rounded-lg border border-ds-border bg-ds-input-bg p-1"
				/>
			</div>
		</div>
	);
}

function isHexColor(value: string) {
	return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value.trim());
}

type IPhoneCompatibilityReport = {
	isCompatible: boolean;
	issues: string[];
};

function getIphoneCompatibilityReport(
	designer: DesignerState,
	encodedData: string,
): IPhoneCompatibilityReport {
	const issues: string[] = [];
	const recommendedSize = getRecommendedSize(
		encodedData,
		hasLogo(designer.logoUrl),
	);

	if (designer.shape !== "square") {
		issues.push("Use square matrix shape.");
	}
	if (
		designer.errorCorrectionLevel !== "Q" &&
		designer.errorCorrectionLevel !== "H"
	) {
		issues.push("Use error correction level Q or H.");
	}
	if (designer.margin < MIN_QUIET_ZONE) {
		issues.push(`Set quiet zone to at least ${MIN_QUIET_ZONE}px.`);
	}
	if (designer.size < recommendedSize) {
		issues.push(
			`Increase preview size to at least ${recommendedSize}px for this URL length.`,
		);
	}

	if (!isHexColor(designer.dotColor) || !isHexColor(designer.backgroundColor)) {
		issues.push("Use valid HEX colors for dots and background.");
	} else {
		const dotContrast = contrastRatio(
			designer.dotColor,
			designer.backgroundColor,
		);
		if (dotContrast < MIN_CONTRAST_RATIO) {
			issues.push("Increase contrast between dots and background.");
		}
	}

	if (
		isHexColor(designer.cornerSquareColor) &&
		isHexColor(designer.backgroundColor)
	) {
		const cornerContrast = contrastRatio(
			designer.cornerSquareColor,
			designer.backgroundColor,
		);
		if (cornerContrast < MIN_CONTRAST_RATIO) {
			issues.push("Increase contrast between corner markers and background.");
		}
	}

	if (hasLogo(designer.logoUrl) && !isHttpUrl(designer.logoUrl)) {
		issues.push("Use a valid HTTP(S) logo URL.");
	}
	if (hasLogo(designer.logoUrl) && designer.logoSize > MAX_LOGO_SIZE) {
		issues.push(
			`Reduce logo size to ${Math.round(MAX_LOGO_SIZE * 100)}% or less.`,
		);
	}
	if (hasLogo(designer.logoUrl) && !designer.hideBackgroundDots) {
		issues.push("Enable mask behind logo.");
	}

	return {
		isCompatible: issues.length === 0,
		issues,
	};
}

function getRecommendedSize(data: string, hasCenterLogo: boolean) {
	if (data.length <= 80) return hasCenterLogo ? 340 : 300;
	if (data.length <= 140) return hasCenterLogo ? 380 : 340;
	if (data.length <= 220) return hasCenterLogo ? 420 : 380;
	return hasCenterLogo ? 460 : 420;
}

function coerceIphoneSafeDesigner(
	designer: DesignerState,
	encodedData: string,
): DesignerState {
	const recommendedSize = getRecommendedSize(
		encodedData,
		hasLogo(designer.logoUrl),
	);
	const backgroundColor = isHexColor(designer.backgroundColor)
		? designer.backgroundColor
		: "#ffffff";
	const fallbackDark = bestContrastForBackground(backgroundColor);
	const dotColorInput = isHexColor(designer.dotColor)
		? designer.dotColor
		: fallbackDark;
	const cornerSquareInput = isHexColor(designer.cornerSquareColor)
		? designer.cornerSquareColor
		: dotColorInput;
	const cornerDotInput = isHexColor(designer.cornerDotColor)
		? designer.cornerDotColor
		: cornerSquareInput;

	const dotColor =
		contrastRatio(dotColorInput, backgroundColor) >= MIN_CONTRAST_RATIO
			? dotColorInput
			: fallbackDark;
	const cornerSquareColor =
		contrastRatio(cornerSquareInput, backgroundColor) >= MIN_CONTRAST_RATIO
			? cornerSquareInput
			: dotColor;
	const cornerDotColor =
		contrastRatio(cornerDotInput, backgroundColor) >= MIN_CONTRAST_RATIO
			? cornerDotInput
			: cornerSquareColor;

	const logoUrl =
		hasLogo(designer.logoUrl) && isHttpUrl(designer.logoUrl)
			? designer.logoUrl.trim()
			: "";

	return {
		...designer,
		shape: "square",
		errorCorrectionLevel:
			designer.errorCorrectionLevel === "Q" ||
			designer.errorCorrectionLevel === "H"
				? designer.errorCorrectionLevel
				: "H",
		dotStyle: isOneOf(
			designer.dotStyle,
			DOT_STYLE_OPTIONS.map((opt) => opt.value),
		)
			? designer.dotStyle
			: "rounded",
		cornerSquareStyle: isOneOf(
			designer.cornerSquareStyle,
			CORNER_SQUARE_OPTIONS.map((opt) => opt.value),
		)
			? designer.cornerSquareStyle
			: "extra-rounded",
		cornerDotStyle: isOneOf(
			designer.cornerDotStyle,
			CORNER_DOT_OPTIONS.map((opt) => opt.value),
		)
			? designer.cornerDotStyle
			: "dot",
		margin: clampNumber(designer.margin, MIN_QUIET_ZONE, MAX_QUIET_ZONE),
		size: clampNumber(
			Math.max(designer.size, recommendedSize),
			MIN_PREVIEW_SIZE,
			MAX_PREVIEW_SIZE,
		),
		logoSize: hasLogo(logoUrl)
			? clampNumber(designer.logoSize, 0.1, MAX_LOGO_SIZE)
			: clampNumber(designer.logoSize, 0.1, MAX_LOGO_SIZE),
		hideBackgroundDots: hasLogo(logoUrl) ? true : designer.hideBackgroundDots,
		logoUrl,
		dotColor,
		cornerSquareColor,
		cornerDotColor,
		backgroundColor,
	};
}

function hasLogo(logoUrl: string) {
	return logoUrl.trim().length > 0;
}

function clampNumber(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function bestContrastForBackground(backgroundColor: string) {
	const blackContrast = contrastRatio("#000000", backgroundColor);
	const whiteContrast = contrastRatio("#ffffff", backgroundColor);
	return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}

function isOneOf<T extends string>(value: string, allowed: readonly T[]) {
	return allowed.includes(value as T);
}

function areDesignerStatesEqual(a: DesignerState, b: DesignerState) {
	return (
		a.size === b.size &&
		a.margin === b.margin &&
		a.shape === b.shape &&
		a.errorCorrectionLevel === b.errorCorrectionLevel &&
		a.dotStyle === b.dotStyle &&
		a.cornerSquareStyle === b.cornerSquareStyle &&
		a.cornerDotStyle === b.cornerDotStyle &&
		a.dotColor === b.dotColor &&
		a.cornerSquareColor === b.cornerSquareColor &&
		a.cornerDotColor === b.cornerDotColor &&
		a.backgroundColor === b.backgroundColor &&
		a.logoUrl === b.logoUrl &&
		a.logoSize === b.logoSize &&
		a.hideBackgroundDots === b.hideBackgroundDots
	);
}

function contrastRatio(colorA: string, colorB: string) {
	const lumA = getRelativeLuminance(colorA);
	const lumB = getRelativeLuminance(colorB);
	const lighter = Math.max(lumA, lumB);
	const darker = Math.min(lumA, lumB);
	return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hexColor: string) {
	const rgb = hexToRgb(hexColor);
	if (!rgb) return 0;
	const toLinear = (channel: number) => {
		const s = channel / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};

	const r = toLinear(rgb.r);
	const g = toLinear(rgb.g);
	const b = toLinear(rgb.b);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string) {
	if (!isHexColor(hex)) return null;
	const normalized =
		hex.length === 4
			? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
			: hex;
	const raw = normalized.replace("#", "");
	const value = Number.parseInt(raw, 16);

	return {
		r: (value >> 16) & 255,
		g: (value >> 8) & 255,
		b: value & 255,
	};
}

function isHttpUrl(value: string) {
	try {
		const parsed = new URL(value.trim());
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 80);
}
