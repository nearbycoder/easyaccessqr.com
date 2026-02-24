import { describe, expect, it } from "vitest";
import {
	absoluteUrl,
	buildHomeStructuredData,
	buildNoIndexMeta,
	buildOgImageUrl,
	buildPageSeo,
	SITE_NAME,
	SITE_URL,
} from "./seo";

describe("absoluteUrl", () => {
	it("resolves paths against production site URL by default", () => {
		expect(absoluteUrl("/pricing")).toBe(`${SITE_URL}/pricing`);
	});
});

describe("buildOgImageUrl", () => {
	it("returns the canonical OG endpoint path", () => {
		expect(
			buildOgImageUrl({
				page: "home",
				title: "Easy Access QR",
				subtitle: "Smart campaigns",
			}),
		).toBe("/api/og");
	});
});

describe("buildPageSeo", () => {
	it("returns canonical link and key SEO meta entries", () => {
		const page = buildPageSeo({
			title: "Pricing | Easy Access QR",
			description: "Compare plans.",
			path: "/pricing",
		});

		expect(page.canonical).toBe(`${SITE_URL}/pricing`);
		expect(page.links).toContainEqual({
			rel: "canonical",
			href: `${SITE_URL}/pricing`,
		});
		expect(page.meta.some((meta) => meta.property === "og:title")).toBe(true);
		expect(page.meta.some((meta) => meta.name === "twitter:image")).toBe(true);
	});
});

describe("buildNoIndexMeta", () => {
	it("returns robots noindex tags", () => {
		expect(buildNoIndexMeta()).toEqual([
			{ name: "robots", content: "noindex, nofollow, noarchive" },
			{ name: "googlebot", content: "noindex, nofollow, noarchive" },
		]);
	});
});

describe("buildHomeStructuredData", () => {
	it("includes software app, organization, and FAQ data when provided", () => {
		const data = buildHomeStructuredData({
			siteUrl: SITE_URL,
			faqItems: [
				{
					question: "Does Easy Access QR support dynamic routing?",
					answer: "Yes.",
				},
			],
		});

		expect(data["@context"]).toBe("https://schema.org");
		expect(Array.isArray(data["@graph"])).toBe(true);
		const graph = data["@graph"] as Array<Record<string, unknown>>;
		expect(graph.some((node) => node["@type"] === "SoftwareApplication")).toBe(
			true,
		);
		expect(
			graph.some(
				(node) => node["@type"] === "Organization" && node.name === SITE_NAME,
			),
		).toBe(true);
		expect(graph.some((node) => node["@type"] === "FAQPage")).toBe(true);
	});
});
