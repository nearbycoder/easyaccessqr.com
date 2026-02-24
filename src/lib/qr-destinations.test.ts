import { describe, expect, it } from "vitest";
import {
	hasValidDestinationConfig,
	MAX_QR_DESTINATIONS,
	normalizeQrDestinations,
	pickWeightedDestination,
} from "./qr-destinations";

describe("normalizeQrDestinations", () => {
	it("drops invalid rows, trims values, limits count, and normalizes to 100 percent", () => {
		const input = [
			{
				id: " primary ",
				label: " Primary route ",
				url: " https://a.com ",
				weight: 80,
			},
			{ id: "secondary", label: "Secondary", url: "http://b.com", weight: 20 },
			{
				id: "invalid",
				label: "Invalid",
				url: "ftp://not-allowed.com",
				weight: 10,
			},
			...Array.from({ length: MAX_QR_DESTINATIONS + 4 }, (_, index) => ({
				id: `extra-${index + 1}`,
				label: `Extra ${index + 1}`,
				url: `https://example-${index + 1}.com`,
				weight: 1,
			})),
		];

		const output = normalizeQrDestinations(input);
		expect(output.length).toBeLessThanOrEqual(MAX_QR_DESTINATIONS);
		expect(output.length).toBeGreaterThan(0);
		expect(output.some((row) => row.id === "invalid")).toBe(false);
		expect(output[0]).toMatchObject({
			id: "primary",
			label: "Primary route",
			url: "https://a.com",
		});
		expect(output.reduce((sum, row) => sum + row.weight, 0)).toBe(100);
	});

	it("creates a primary fallback when no valid rows are present", () => {
		const output = normalizeQrDestinations([], "https://fallback.example");
		expect(output).toEqual([
			{
				id: "dest-1",
				label: "Primary",
				url: "https://fallback.example",
				weight: 100,
			},
		]);
	});
});

describe("hasValidDestinationConfig", () => {
	it("returns true only when routing resolves to valid HTTP(S) rows totaling 100", () => {
		expect(
			hasValidDestinationConfig([
				{ url: "https://one.example", weight: 1 },
				{ url: "https://two.example", weight: 1 },
			]),
		).toBe(true);
		expect(
			hasValidDestinationConfig([{ url: "javascript:alert(1)", weight: 100 }]),
		).toBe(false);
	});
});

describe("pickWeightedDestination", () => {
	it("selects rows by weighted threshold boundaries", () => {
		const rows = normalizeQrDestinations([
			{ id: "a", label: "A", url: "https://a.example", weight: 70 },
			{ id: "b", label: "B", url: "https://b.example", weight: 30 },
		]);

		expect(pickWeightedDestination(rows, 0)?.id).toBe("a");
		expect(pickWeightedDestination(rows, 0.6999)?.id).toBe("a");
		expect(pickWeightedDestination(rows, 0.7)?.id).toBe("b");
		expect(pickWeightedDestination(rows, 0.999999)?.id).toBe("b");
	});
});
