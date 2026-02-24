export type QrDownloadExtension = "png" | "svg" | "jpeg" | "webp";

export type QrDownloadableInstance = {
	download: (options?: {
		name?: string;
		extension?: QrDownloadExtension;
	}) => Promise<void>;
	getRawData?: (extension?: QrDownloadExtension) => Promise<unknown>;
};

export async function downloadQrAsset(options: {
	instance: QrDownloadableInstance;
	name: string;
	extension: QrDownloadExtension;
	backgroundColor?: string;
}) {
	const { instance, name, extension, backgroundColor } = options;

	if (extension !== "svg" || !instance.getRawData) {
		await instance.download({ name, extension });
		return;
	}

	const raw = await instance.getRawData("svg");
	const rawSvg = await toSvgMarkup(raw);
	if (!rawSvg) {
		await instance.download({ name, extension });
		return;
	}

	const normalizedBackground = normalizeHexColor(backgroundColor);
	const svgWithBackground = normalizedBackground
		? injectSvgBackground(rawSvg, normalizedBackground)
		: rawSvg;
	const svgBlob = new Blob([svgWithBackground], {
		type: "image/svg+xml;charset=utf-8",
	});
	downloadBlob(`${name}.svg`, svgBlob);
}

async function toSvgMarkup(raw: unknown): Promise<string | null> {
	if (!raw) return null;
	if (typeof raw === "string") return raw;
	if (raw instanceof Blob) {
		return raw.text();
	}
	if (raw instanceof ArrayBuffer) {
		return new TextDecoder().decode(new Uint8Array(raw));
	}
	if (raw instanceof Uint8Array) {
		return new TextDecoder().decode(raw);
	}
	return null;
}

function injectSvgBackground(svgMarkup: string, color: string) {
	try {
		const parser = new DOMParser();
		const xml = parser.parseFromString(svgMarkup, "image/svg+xml");
		const root = xml.documentElement;
		if (!root || root.nodeName === "parsererror") return svgMarkup;

		const existing = root.querySelector('rect[data-easyaccess-bg="true"]');
		existing?.remove();

		const rect = xml.createElementNS("http://www.w3.org/2000/svg", "rect");
		rect.setAttribute("x", "0");
		rect.setAttribute("y", "0");
		rect.setAttribute("width", "100%");
		rect.setAttribute("height", "100%");
		rect.setAttribute("fill", color);
		rect.setAttribute("data-easyaccess-bg", "true");
		root.insertBefore(rect, root.firstChild);

		return new XMLSerializer().serializeToString(xml);
	} catch {
		return svgMarkup;
	}
}

function downloadBlob(fileName: string, blob: Blob) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.rel = "noreferrer";
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

function normalizeHexColor(value: string | undefined) {
	if (!value) return null;
	const trimmed = value.trim();
	return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(trimmed) ? trimmed : null;
}
