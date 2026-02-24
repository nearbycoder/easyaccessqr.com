import { afterEach, describe, expect, it } from "vitest";
import {
	contentTypeIsJson,
	hasTrustedBrowserOrigin,
	withServerSecurityHeaders,
} from "./server-security";

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;
const originalBetterAuthTrustedOrigins =
	process.env.BETTER_AUTH_TRUSTED_ORIGINS;

afterEach(() => {
	process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
	process.env.BETTER_AUTH_TRUSTED_ORIGINS = originalBetterAuthTrustedOrigins;
});

describe("hasTrustedBrowserOrigin", () => {
	it("accepts same-origin request origin", () => {
		const request = new Request("https://app.easyaccessqr.com/api/trpc", {
			headers: {
				origin: "https://app.easyaccessqr.com",
			},
		});

		expect(hasTrustedBrowserOrigin(request)).toBe(true);
	});

	it("accepts configured trusted origin", () => {
		process.env.BETTER_AUTH_TRUSTED_ORIGINS = "https://easyaccessqr.com";
		const request = new Request("https://app.easyaccessqr.com/api/trpc", {
			headers: {
				origin: "https://easyaccessqr.com",
			},
		});

		expect(hasTrustedBrowserOrigin(request)).toBe(true);
	});

	it("rejects untrusted origin", () => {
		const request = new Request("https://app.easyaccessqr.com/api/trpc", {
			headers: {
				origin: "https://malicious.example",
			},
		});

		expect(hasTrustedBrowserOrigin(request)).toBe(false);
	});

	it("rejects requests without origin when allowNoOrigin is false", () => {
		const request = new Request("https://app.easyaccessqr.com/api/trpc");
		expect(hasTrustedBrowserOrigin(request, { allowNoOrigin: false })).toBe(
			false,
		);
	});
});

describe("contentTypeIsJson", () => {
	it("accepts application/json content types", () => {
		const request = new Request("https://app.easyaccessqr.com/api/trpc", {
			method: "POST",
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
			body: "{}",
		});
		expect(contentTypeIsJson(request)).toBe(true);
	});

	it("rejects non-json content types", () => {
		const request = new Request("https://app.easyaccessqr.com/api/trpc", {
			method: "POST",
			headers: {
				"content-type": "text/plain",
			},
			body: "payload",
		});
		expect(contentTypeIsJson(request)).toBe(false);
	});
});

describe("withServerSecurityHeaders", () => {
	it("adds default hardening headers", async () => {
		const request = new Request("https://app.easyaccessqr.com/api/trpc");
		const response = withServerSecurityHeaders(new Response("ok"), { request });

		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("x-frame-options")).toBe("DENY");
		expect(response.headers.get("referrer-policy")).toBe(
			"strict-origin-when-cross-origin",
		);
		expect(response.headers.get("strict-transport-security")).toContain(
			"max-age=31536000",
		);
		expect(await response.text()).toBe("ok");
	});
});
