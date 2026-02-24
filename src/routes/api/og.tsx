import { createFileRoute } from "@tanstack/react-router";
import { withServerSecurityHeaders } from "@/lib/server-security";

type OgPage = "home" | "docs" | "privacy" | "terms";

const themes: Record<
	OgPage,
	{ label: string; title: string; subtitle: string; accent: string }
> = {
	home: {
		label: "Easy Access QR",
		title: "Create. Track. Optimize.",
		subtitle: "Dynamic QR code creation and scan analytics for organizations.",
		accent: "#22d3ee",
	},
	docs: {
		label: "Developer",
		title: "Api reference",
		subtitle: "Use API keys to automate QR creation and scan reporting.",
		accent: "#facc15",
	},
	privacy: {
		label: "Legal",
		title: "Privacy policy",
		subtitle: "How Easy Access QR handles data and security.",
		accent: "#a3e635",
	},
	terms: {
		label: "Legal",
		title: "Terms of service",
		subtitle: "Rules and responsibilities for using Easy Access QR.",
		accent: "#f97316",
	},
};

function resolvePage(value: string | null): OgPage {
	if (value === "docs" || value === "privacy" || value === "terms") {
		return value;
	}
	return "home";
}

function sanitizeText(
	value: string | null,
	fallback: string,
	maxLength: number,
) {
	if (!value) return fallback;
	const trimmed = value.replace(/\s+/g, " ").trim();
	if (!trimmed) return fallback;
	return trimmed.slice(0, maxLength);
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function buildSvg(
	label: string,
	title: string,
	subtitle: string,
	accent: string,
) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="735" viewBox="0 0 1400 735" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
  </defs>
  <rect width="1400" height="735" fill="url(#bg)" />
  <text x="70" y="100" fill="${escapeXml(accent)}" font-size="28" font-family="Menlo, Monaco, Consolas, monospace" font-weight="700">${escapeXml(label)}</text>
  <text x="70" y="300" fill="#f8fafc" font-size="96" font-family="Menlo, Monaco, Consolas, monospace" font-weight="800">${escapeXml(title)}</text>
  <text x="70" y="390" fill="#cbd5e1" font-size="40" font-family="Menlo, Monaco, Consolas, monospace" font-weight="500">${escapeXml(subtitle)}</text>
  <text x="70" y="655" fill="#94a3b8" font-size="28" font-family="Menlo, Monaco, Consolas, monospace" font-weight="700">easyaccessqr.com</text>
</svg>`;
}

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({ request }: { request: Request }) => {
				const url = new URL(request.url);
				const page = resolvePage(url.searchParams.get("page"));
				const theme = themes[page];
				const title = sanitizeText(
					url.searchParams.get("title"),
					theme.title,
					70,
				);
				const subtitle = sanitizeText(
					url.searchParams.get("subtitle"),
					theme.subtitle,
					140,
				);
				const svg = buildSvg(theme.label, title, subtitle, theme.accent);

				return withServerSecurityHeaders(
					new Response(svg, {
						headers: {
							"content-type": "image/svg+xml; charset=utf-8",
							"cache-control": "public, max-age=3600",
						},
					}),
					{
						request,
						frameOptions: null,
					},
				);
			},
		}
	: {};

export const Route = createFileRoute("/api/og")({
	server: {
		handlers: serverHandlers,
	},
});
