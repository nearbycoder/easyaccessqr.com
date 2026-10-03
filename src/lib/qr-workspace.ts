import { z } from "zod";
import {
	campaignUrl,
	httpUrl,
	type ToolkitFields,
	toolkitTypes,
} from "./qr-toolkit";

export const campaignPresets = [
	{ id: "poster", name: "Poster", source: "poster", medium: "qr" },
	{ id: "packaging", name: "Packaging", source: "packaging", medium: "qr" },
	{ id: "event", name: "Event", source: "event", medium: "qr" },
	{
		id: "email",
		name: "Email newsletter",
		source: "newsletter",
		medium: "email",
	},
] as const;

// IDs identify browser preferences, rather than authentication credentials.
export function createLocalId() {
	return (
		globalThis.crypto?.randomUUID?.() ||
		`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
	);
}

export function importCampaignUrl(value: string): ToolkitFields {
	const url = httpUrl(value);
	const fields: ToolkitFields = {};
	for (const key of ["source", "medium", "campaign", "term", "content"]) {
		fields[key] = url.searchParams.get(`utm_${key}`) || "";
		url.searchParams.delete(`utm_${key}`);
	}
	return { ...fields, url: url.toString() };
}
export function normalizeCampaign(fields: ToolkitFields): ToolkitFields {
	const next = { ...fields };
	for (const key of ["source", "medium", "campaign", "term", "content"])
		next[key] = (fields[key] || "").trim().toLowerCase().replace(/\s+/g, "-");
	return next;
}
export function campaignVariants(fields: ToolkitFields, value: string) {
	const sources = [
		...new Set(
			value
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean),
		),
	];
	if (!sources.length || sources.length > 100)
		throw new Error("Enter between 1 and 100 sources, one per line.");
	return sources.map((source) => ({
		source,
		url: campaignUrl({ ...fields, source }),
	}));
}

export const toolkitDesignSchema = z.object({
	foreground: z.string().regex(/^#[\da-f]{6}$/i),
	background: z.string().regex(/^#[\da-f]{6}$/i),
	dots: z.enum(["square", "rounded"]),
	size: z.union([z.literal(600), z.literal(1200), z.literal(2400)]),
	filename: z.string().max(80),
});
export type ToolkitDesign = z.infer<typeof toolkitDesignSchema>;
export const defaultToolkitDesign: ToolkitDesign = {
	foreground: "#172522",
	background: "#ffffff",
	dots: "square",
	size: 600,
	filename: "",
};
export const designPresets = [
	{
		id: "classic",
		name: "Classic",
		foreground: "#172522",
		background: "#ffffff",
		dots: "square",
	},
	{
		id: "teal",
		name: "Teal",
		foreground: "#205f5c",
		background: "#ffffff",
		dots: "rounded",
	},
	{
		id: "ink",
		name: "Ink",
		foreground: "#243454",
		background: "#f4f6fb",
		dots: "square",
	},
] as const;
function luminance(hex: string) {
	const rgb = [1, 3, 5].map((offset) => {
		const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
		return channel <= 0.04045
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4;
	});
	return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function designContrast(
	design: Pick<ToolkitDesign, "foreground" | "background">,
) {
	const ink = luminance(design.foreground),
		paper = luminance(design.background);
	const ratio = (Math.max(ink, paper) + 0.05) / (Math.min(ink, paper) + 0.05);
	return { ratio, safe: ratio >= 4.5 && ink < paper };
}

const typeSchema = z.enum(toolkitTypes.map(([type]) => type));
export const toolkitDraftSchema = z.object({
	id: z.string().min(1).max(100),
	name: z.string().trim().min(1).max(80),
	type: typeSchema,
	fields: z
		.record(z.string().max(40), z.string().max(1600))
		.refine((fields) => Object.keys(fields).length <= 30),
	title: z.string().max(80),
	caption: z.string().max(240),
	design: toolkitDesignSchema,
});
export type ToolkitDraft = z.infer<typeof toolkitDraftSchema>;
export const toolkitDraftsSchema = z.array(toolkitDraftSchema).max(30);
export function sanitizeDraft(draft: ToolkitDraft): ToolkitDraft {
	const parsed = toolkitDraftSchema.parse(draft);
	if (parsed.type === "wifi") {
		const { password: _password, ...fields } = parsed.fields;
		return { ...parsed, fields };
	}
	return parsed;
}
export function serializeDraft(draft: ToolkitDraft) {
	return JSON.stringify({ version: 1, draft: sanitizeDraft(draft) }, null, 2);
}
export function parseDraft(value: string) {
	if (value.length > 60_000)
		throw new Error("Draft files must be smaller than 60 KB.");
	try {
		const data = z
			.object({ version: z.literal(1), draft: toolkitDraftSchema })
			.parse(JSON.parse(value));
		return sanitizeDraft(data.draft);
	} catch {
		throw new Error("This is not a supported Easy Access QR draft.");
	}
}
export function destinationHost(url: string) {
	try {
		return httpUrl(url).hostname.toLowerCase();
	} catch {
		return "";
	}
}
export const savedViewSchema = z.object({
	id: z.string().min(1).max(100),
	name: z.string().trim().min(1).max(60),
	search: z.string().max(1600),
	status: z.enum(["all", "active", "paused"]),
	tag: z.string().max(30),
	sort: z.enum(["newest", "name", "views"]),
	host: z.string().max(253),
	favoritesOnly: z.boolean(),
	filters: z.object({
		visibility: z.enum(["all", "public", "private"]),
		routing: z.enum(["all", "single", "weighted"]),
		activity: z.enum(["all", "never", "scanned"]),
	}),
});
export type SavedLibraryView = z.infer<typeof savedViewSchema>;
export const libraryPreferencesSchema = z.object({
	favorites: z.array(z.number().int().positive()).max(2000),
	views: z.array(savedViewSchema).max(20),
});
export const defaultLibraryPreferences: z.infer<
	typeof libraryPreferencesSchema
> = { favorites: [], views: [] };
