import { z } from "zod";
export const bulkQrSchema = z
	.object({
		ids: z
			.array(z.number().int().positive())
			.min(1)
			.max(100)
			.transform((ids) => [...new Set(ids)]),
		action: z.enum([
			"pause",
			"resume",
			"public",
			"private",
			"add-tag",
			"remove-tag",
		]),
		tag: z.string().trim().min(1).max(30).optional(),
	})
	.superRefine((input, ctx) => {
		if (["add-tag", "remove-tag"].includes(input.action) && !input.tag)
			ctx.addIssue({ code: "custom", path: ["tag"], message: "Enter a tag." });
	});
export type LibraryFilters = {
	visibility: string;
	routing: string;
	activity: string;
};
export const defaultLibraryFilters: LibraryFilters = {
	visibility: "all",
	routing: "all",
	activity: "all",
};
export function matchesLibraryFilters(
	code: { isPublic: boolean; destinations: unknown[]; scanCount: number },
	filters: LibraryFilters,
) {
	if (filters.visibility === "public" && !code.isPublic) return false;
	if (filters.visibility === "private" && code.isPublic) return false;
	if (filters.routing === "single" && code.destinations.length !== 1)
		return false;
	if (filters.routing === "weighted" && code.destinations.length < 2)
		return false;
	if (filters.activity === "never" && code.scanCount !== 0) return false;
	if (filters.activity === "scanned" && code.scanCount === 0) return false;
	return true;
}
export function updatedTags(
	tags: string[],
	action: "add-tag" | "remove-tag",
	tag: string,
) {
	const next =
		action === "add-tag"
			? [...new Set([...tags, tag])]
			: tags.filter((value) => value !== tag);
	if (next.length > 12)
		throw new Error(
			"A code would exceed the 12-tag limit. Remove a tag first.",
		);
	return next;
}
export function assertActivationLimit(
	active: number,
	additional: number,
	limit: number,
) {
	if (limit >= 0 && active + additional > limit)
		throw new Error(
			`This selection would exceed your plan limit of ${limit} active QR codes. Pause codes or select fewer to resume.`,
		);
}
