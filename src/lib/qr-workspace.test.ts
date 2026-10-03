import { describe, expect, it } from "vitest";
import { buildToolkitPayload } from "./qr-toolkit";
import {
	campaignVariants,
	defaultToolkitDesign,
	designContrast,
	designPresets,
	destinationHost,
	importCampaignUrl,
	libraryPreferencesSchema,
	normalizeCampaign,
	parseDraft,
	sanitizeDraft,
	serializeDraft,
	type ToolkitDraft,
} from "./qr-workspace";

describe("new toolkit formats", () => {
	it("validates web destinations and builds encoded place links", () => {
		expect(
			buildToolkitPayload("website", { url: "https://example.com/a?q=1#buy" }),
		).toBe("https://example.com/a?q=1#buy");
		for (const url of [
			"javascript:alert(1)",
			"https://user:secret@example.com",
			"ftp://example.com",
		])
			expect(() => buildToolkitPayload("website", { url })).toThrow();
		const location = new URL(
			buildToolkitPayload("place", { address: "Café & Co, Chicago" }),
		);
		expect(location.searchParams.get("query")).toBe("Café & Co, Chicago");
		expect(location.searchParams.get("api")).toBe("1");
	});
	it("builds social links while preventing paths and query injection", () => {
		expect(
			buildToolkitPayload("social", { platform: "tiktok", handle: "@nearby" }),
		).toBe("https://www.tiktok.com/@nearby");
		expect(
			buildToolkitPayload("social", {
				platform: "linkedin",
				handle: "jane-doe",
			}),
		).toBe("https://www.linkedin.com/in/jane-doe");
		for (const handle of ["user?redirect=bad", "user/name", " ", "user name"])
			expect(() => buildToolkitPayload("social", { handle })).toThrow();
		expect(() =>
			buildToolkitPayload("social", { platform: "bad", handle: "ok" }),
		).toThrow();
	});
	it("creates scanner event payloads with UTC times and escaped text", () => {
		const fields = {
			name: "Launch\nDTSTART:bad",
			start: "2026-10-04T10:00",
			end: "2026-10-04T11:00",
			address: "A;B",
			message: "Bring friends, too",
		};
		const payload = buildToolkitPayload("event", fields);
		expect(payload).toMatch(/^BEGIN:VEVENT\r\n/);
		expect(payload).toContain(
			"DTSTART:20261004T100000Z\r\nDTEND:20261004T110000Z",
		);
		expect(payload).toContain("SUMMARY:Launch\\nDTSTART:bad\r\n");
		expect(payload).toContain("LOCATION:A\\;B");
		for (const start of [
			"2026-02-30T12:00",
			"2026-10-04T10:00Z",
			"bad",
			"2026-10-04T25:00",
		])
			expect(() =>
				buildToolkitPayload("event", { ...fields, start }),
			).toThrow();
		expect(() =>
			buildToolkitPayload("event", { ...fields, end: fields.start }),
		).toThrow("after");
	});
});
describe("campaign workflows", () => {
	it("imports existing UTM values without losing anchors or unrelated parameters", () => {
		const fields = importCampaignUrl(
			"https://example.com/shop?sku=7&utm_source=Store+One&utm_medium=qr&utm_campaign=Fall&utm_content=front#buy",
		);
		expect(fields).toEqual({
			url: "https://example.com/shop?sku=7#buy",
			source: "Store One",
			medium: "qr",
			campaign: "Fall",
			term: "",
			content: "front",
		});
		expect(normalizeCampaign(fields)).toMatchObject({
			source: "store-one",
			campaign: "fall",
			url: fields.url,
		});
	});
	it("deduplicates variant sources and validates the entire batch before export", () => {
		const fields = {
			url: "https://example.com/?sku=7#buy",
			medium: "qr",
			campaign: "launch",
			content: "front",
		};
		const rows = campaignVariants(fields, " chicago\r\naustin\nchicago\n ");
		expect(rows).toHaveLength(2);
		expect(new URL(rows[0].url).searchParams.get("utm_source")).toBe("chicago");
		expect(new URL(rows[0].url).searchParams.get("utm_content")).toBe("front");
		expect(new URL(rows[0].url).hash).toBe("#buy");
		expect(() => campaignVariants(fields, "")).toThrow("1 and 100");
		expect(() =>
			campaignVariants(
				fields,
				Array.from({ length: 101 }, (_, index) => String(index)).join("\n"),
			),
		).toThrow("1 and 100");
		expect(() => campaignVariants({ ...fields, campaign: "" }, "a\nb")).toThrow(
			"required",
		);
	});
});
describe("design and portable drafts", () => {
	const draft: ToolkitDraft = {
		id: "draft-1",
		name: "Guest Wi-Fi",
		type: "wifi",
		fields: { ssid: "Guest", password: "never-persist-this", security: "WPA" },
		title: "Welcome",
		caption: "Scan to connect",
		design: defaultToolkitDesign,
	};
	it("requires sufficient contrast with dark foreground on light background", () => {
		expect(
			designContrast({ foreground: "#000000", background: "#ffffff" }),
		).toEqual({ ratio: 21, safe: true });
		expect(
			designContrast({ foreground: "#ffffff", background: "#000000" }).safe,
		).toBe(false);
		expect(
			designContrast({ foreground: "#eeeeee", background: "#ffffff" }).safe,
		).toBe(false);
		for (const preset of designPresets)
			expect(designContrast(preset).safe).toBe(true);
	});
	it("never saves or imports a Wi-Fi password and does not mutate the editor", () => {
		expect(sanitizeDraft(draft).fields).not.toHaveProperty("password");
		expect(serializeDraft(draft)).not.toContain("never-persist-this");
		expect(
			parseDraft(JSON.stringify({ version: 1, draft })).fields,
		).not.toHaveProperty("password");
		expect(draft.fields.password).toBe("never-persist-this");
		expect(parseDraft(serializeDraft(draft))).toMatchObject({
			name: draft.name,
			design: defaultToolkitDesign,
		});
	});
	it("rejects oversized, invalid, or future draft formats", () => {
		for (const value of [
			"invalid",
			JSON.stringify({ version: 2, draft }),
			JSON.stringify({
				version: 1,
				draft: { ...draft, design: { ...draft.design, size: 999999 } },
			}),
		])
			expect(() => parseDraft(value)).toThrow("supported");
		expect(() => parseDraft("x".repeat(60_001))).toThrow("60 KB");
	});
});
describe("library preferences", () => {
	it("compares hostnames, excludes credentials, and rejects unsafe saved state", () => {
		expect(
			destinationHost("https://EXAMPLE.com/path?example=another.com"),
		).toBe("example.com");
		expect(destinationHost("javascript:alert(1)")).toBe("");
		expect(destinationHost("https://user:secret@example.com")).toBe("");
		expect(
			libraryPreferencesSchema.safeParse({ favorites: [-1], views: [] })
				.success,
		).toBe(false);
		expect(
			libraryPreferencesSchema.safeParse({ favorites: [1], views: [] }).success,
		).toBe(true);
	});
});
