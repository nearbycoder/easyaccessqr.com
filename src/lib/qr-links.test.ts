import { describe, expect, it } from "vitest";
import { buildQrShortPath, slugifyQrName, toAbsoluteUrl } from "./qr-links";

describe("slugifyQrName", () => {
	it("creates predictable lowercase slugs", () => {
		expect(slugifyQrName("  Spring Launch 2026! ")).toBe("spring-launch-2026");
		expect(slugifyQrName("___")).toBe("");
	});
});

describe("buildQrShortPath", () => {
	it("builds route path when organization and slug are present", () => {
		expect(buildQrShortPath("acme", "launch")).toBe("/r/acme/launch");
		expect(buildQrShortPath("", "launch")).toBe("");
		expect(buildQrShortPath("acme", "")).toBe("");
	});
});

describe("toAbsoluteUrl", () => {
	it("keeps absolute URLs as-is", () => {
		expect(toAbsoluteUrl("https://example.com/demo")).toBe(
			"https://example.com/demo",
		);
	});

	it("prefixes relative paths with current browser origin", () => {
		expect(toAbsoluteUrl("/r/acme/launch")).toBe(
			`${window.location.origin}/r/acme/launch`,
		);
	});
});
