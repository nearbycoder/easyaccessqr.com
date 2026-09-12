import { describe, expect, it } from "vitest";
import {
	buildToolkitPayload,
	campaignUrl,
	cleanTrackingUrl,
} from "./qr-toolkit";

describe("QR toolkit payloads", () => {
	it("escapes Wi-Fi delimiters and preserves password whitespace", () => {
		expect(
			buildToolkitPayload("wifi", {
				ssid: "Cafe;Guest",
				password: " pass:word\\ ",
				hidden: "true",
			}),
		).toBe("WIFI:T:WPA;S:Cafe\\;Guest;P: pass\\:word\\\\ ;H:true;;");
	});
	it("omits passwords on open networks", () => {
		expect(
			buildToolkitPayload("wifi", {
				ssid: "Guest",
				password: "secret",
				security: "nopass",
			}),
		).toBe("WIFI:T:nopass;S:Guest;P:;H:false;;");
	});
	it("validates network byte limits and password requirements", () => {
		expect(() =>
			buildToolkitPayload("wifi", { ssid: "é".repeat(17), security: "nopass" }),
		).toThrow("32 UTF-8 bytes");
		expect(() => buildToolkitPayload("wifi", { ssid: "Guest" })).toThrow(
			"password",
		);
	});
	it("writes escaped vCards without allowing field injection", () => {
		const result = buildToolkitPayload("contact", {
			name: "Doe, Jane\nTEL:bad",
			organization: "A;B",
			phone: "+1 (212) 555-0123",
			email: "jane@example.com",
		});
		expect(result).toContain("FN:Doe\\, Jane\\nTEL:bad\r\n");
		expect(result).toContain("ORG:A\\;B\r\nTEL;VALUE=uri:tel:+12125550123");
		expect(result).toMatch(/^BEGIN:VCARD\r\nVERSION:4.0/);
		expect(result).toMatch(/END:VCARD\r\n$/);
	});
	it("folds long Unicode vCard lines at UTF-8 boundaries", () => {
		const name = "花".repeat(80);
		const result = buildToolkitPayload("contact", { name });
		for (const line of result.split("\r\n"))
			expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
		expect(result.replace(/\r\n /g, "")).toContain(`FN:${name}\r\n`);
	});
	it("encodes mail headers and message delimiters", () => {
		const result = buildToolkitPayload("email", {
			email: "hi@example.com",
			subject: "A & B",
			message: "hello\nworld",
		});
		expect(result).toBe(
			"mailto:hi@example.com?subject=A%20%26%20B&body=hello%0Aworld",
		);
	});
	it.each([
		"phone",
		"sms",
		"whatsapp",
	] as const)("validates international %s numbers", (type) => {
		expect(() => buildToolkitPayload(type, { phone: "123" })).toThrow(
			"international",
		);
		expect(() =>
			buildToolkitPayload(type, { phone: "+123456789?body=bad" }),
		).toThrow("international");
	});
	it("builds phone, SMS, and WhatsApp actions", () => {
		expect(buildToolkitPayload("phone", { phone: "+1 212 555 0123" })).toBe(
			"tel:+12125550123",
		);
		expect(
			buildToolkitPayload("sms", {
				phone: "+12125550123",
				message: "Hi & bye",
			}),
		).toBe("sms:+12125550123?body=Hi%20%26%20bye");
		expect(
			buildToolkitPayload("whatsapp", {
				phone: "+12125550123",
				message: "Hi!",
			}),
		).toBe("https://wa.me/12125550123?text=Hi!");
	});
	it("handles zero coordinates and rejects out-of-range locations", () => {
		expect(
			buildToolkitPayload("location", { latitude: "0", longitude: "-180" }),
		).toBe("geo:0,-180");
		expect(() =>
			buildToolkitPayload("location", { latitude: "91", longitude: "0" }),
		).toThrow("Latitude");
		expect(() =>
			buildToolkitPayload("location", { latitude: "", longitude: "0" }),
		).toThrow("required");
	});
	it("preserves plain text and limits encoded byte size", () => {
		expect(buildToolkitPayload("text", { text: " Hello\n世界 " })).toBe(
			" Hello\n世界 ",
		);
		expect(() =>
			buildToolkitPayload("text", { text: "界".repeat(600) }),
		).toThrow("too long");
	});
	it("builds UTM links preserving unrelated parameters and anchors", () => {
		const result = campaignUrl({
			url: "https://example.com/Path?sku=42&utm_source=old&utm_term=old#buy",
			source: "poster",
			medium: "qr",
			campaign: "Fall sale",
		});
		expect(result).toBe(
			"https://example.com/Path?sku=42&utm_source=poster&utm_medium=qr&utm_campaign=Fall+sale#buy",
		);
	});
	it("removes tracking parameters without altering the destination", () => {
		expect(
			cleanTrackingUrl(
				"https://example.com/a?sku=1&utm_source=x&UTM_TERM=y&fbclid=a&fbclid=b#g",
			),
		).toBe("https://example.com/a?sku=1#g");
	});
	it.each([
		"javascript:alert(1)",
		"https://user:pass@example.com",
		"not a URL",
	])("rejects unsafe URLs: %s", (url) => {
		expect(() => cleanTrackingUrl(url)).toThrow();
		expect(() =>
			campaignUrl({ url, source: "a", medium: "b", campaign: "c" }),
		).toThrow();
	});
});
