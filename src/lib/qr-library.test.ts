import { describe, expect, it } from "vitest";
import {
	assertActivationLimit,
	bulkQrSchema,
	defaultLibraryFilters,
	matchesLibraryFilters,
	updatedTags,
} from "./qr-library";

describe("library controls", () => {
	const code = { isPublic: true, destinations: [{}, {}], scanCount: 0 };
	it("composes all three filters", () => {
		expect(
			matchesLibraryFilters(code, {
				visibility: "public",
				routing: "weighted",
				activity: "never",
			}),
		).toBe(true);
		for (const filter of [
			{ visibility: "private" },
			{ routing: "single" },
			{ activity: "scanned" },
		])
			expect(
				matchesLibraryFilters(code, { ...defaultLibraryFilters, ...filter }),
			).toBe(false);
		expect(matchesLibraryFilters(code, defaultLibraryFilters)).toBe(true);
	});
	it("deduplicates IDs, limits batches, and requires tags", () => {
		expect(bulkQrSchema.parse({ ids: [1, 1, 2], action: "pause" }).ids).toEqual(
			[1, 2],
		);
		for (const input of [
			{ ids: [], action: "pause" },
			{ ids: [1], action: "delete" },
			{ ids: [1], action: "add-tag" },
			{ ids: [1], action: "remove-tag", tag: " " },
			{ ids: Array(101).fill(1), action: "pause" },
		])
			expect(bulkQrSchema.safeParse(input).success).toBe(false);
	});
	it("adds tags idempotently and removes exact matches", () => {
		expect(updatedTags(["launch"], "add-tag", "launch")).toEqual(["launch"]);
		expect(updatedTags(["launch", "event"], "remove-tag", "launch")).toEqual([
			"event",
		]);
		expect(() =>
			updatedTags(
				Array.from({ length: 12 }, (_, i) => String(i)),
				"add-tag",
				"extra",
			),
		).toThrow("12-tag");
	});
	it("checks only additional activations and supports unlimited plans", () => {
		expect(() => assertActivationLimit(2, 1, 3)).not.toThrow();
		expect(() => assertActivationLimit(3, 1, 3)).toThrow("plan limit");
		expect(() => assertActivationLimit(3, 0, 3)).not.toThrow();
		expect(() => assertActivationLimit(100, 100, -1)).not.toThrow();
	});
});
