import { createFileRoute } from "@tanstack/react-router";
import {
	normalizeQrDestinations,
	pickWeightedDestination,
} from "@/lib/qr-destinations";
import { withServerSecurityHeaders } from "@/lib/server-security";

const serverHandlers = import.meta.env.SSR
	? {
			GET: async ({
				request,
				params,
			}: {
				request: Request;
				params: { organizationSlug: string; qrSlug: string };
			}) => {
				const [{ and, eq }, { db }, { organization, qrCode }] =
					await Promise.all([
						import("drizzle-orm"),
						import("@/db"),
						import("@/db/schema"),
					]);

				const organizationSlug = normalizeSlug(params.organizationSlug);
				const qrSlug = normalizeSlug(params.qrSlug);
				if (!organizationSlug || !qrSlug) {
					return statusPageResponse({
						request,
						status: 404,
						tag: "Link not found",
						title: "This QR link does not exist",
						description:
							"The link may be incorrect, expired, or removed by the organization owner.",
					});
				}

				const org = await db.query.organization.findFirst({
					where: eq(organization.slug, organizationSlug),
					columns: { id: true },
				});
				if (!org) {
					return statusPageResponse({
						request,
						status: 404,
						tag: "Link not found",
						title: "This QR link does not exist",
						description:
							"The link may be incorrect, expired, or removed by the organization owner.",
					});
				}

				const code = await db.query.qrCode.findFirst({
					where: and(
						eq(qrCode.organizationId, org.id),
						eq(qrCode.slug, qrSlug),
					),
					columns: {
						id: true,
						name: true,
						organizationId: true,
						destinationUrl: true,
						destinations: true,
						isActive: true,
						isPublic: true,
					},
				});

				if (!code) {
					return statusPageResponse({
						request,
						status: 404,
						tag: "Link not found",
						title: "This QR link does not exist",
						description:
							"The link may be incorrect, expired, or removed by the organization owner.",
					});
				}

				const requestUrl = new URL(request.url);
				if (isPublicPreviewRequest(requestUrl)) {
					if (!code.isPublic) {
						return statusPageResponse({
							request,
							status: 404,
							tag: "Not public",
							title: "This QR page is private",
							description:
								"This QR code is not currently shared as a public page.",
						});
					}

					const shortPath = `/r/${organizationSlug}/${qrSlug}`;
					const shortUrl = new URL(shortPath, requestUrl.origin).toString();
					return publicQrPageResponse({
						request,
						name: code.name,
						shortUrl,
						destinationUrl: code.destinationUrl,
					});
				}

				if (!code.isActive) {
					return statusPageResponse({
						request,
						status: 410,
						tag: "Link paused",
						title: "This QR link is paused",
						description:
							"The organization has temporarily paused this destination. Try again later or contact the owner.",
					});
				}

				const destinationRules = normalizeQrDestinations(
					code.destinations,
					code.destinationUrl,
				);
				const selectedDestination = pickWeightedDestination(
					destinationRules,
					getRandomUnit(),
				);
				const destination = buildDestinationUrl(
					request,
					selectedDestination?.url ?? code.destinationUrl,
				);
				if (!destination) {
					return statusPageResponse({
						request,
						status: 500,
						tag: "Redirect unavailable",
						title: "This destination is unavailable",
						description:
							"The QR code is active, but its destination URL is invalid. Ask the organization owner to update the link.",
					});
				}

				const scanPayload = await extractScanPayload(request);
				await trackScan({
					qrCodeId: code.id,
					organizationId: code.organizationId,
					selectedDestinationId: selectedDestination?.id,
					selectedDestinationUrl: selectedDestination?.url,
					...scanPayload,
				});

				return withServerSecurityHeaders(
					new Response(null, {
						status: 302,
						headers: {
							location: destination,
							"cache-control": "no-store",
						},
					}),
					{
						request,
						frameOptions: null,
						referrerPolicy: "no-referrer",
					},
				);
			},
		}
	: {};

export const Route = createFileRoute("/r/$organizationSlug/$qrSlug")({
	server: {
		handlers: serverHandlers,
	},
});

function normalizeSlug(value: string) {
	return value.trim().toLowerCase();
}

function isPublicPreviewRequest(url: URL) {
	const flag =
		url.searchParams.get("view") ??
		url.searchParams.get("preview") ??
		url.searchParams.get("qr");
	if (!flag) return false;
	const normalized = flag.trim().toLowerCase();
	return normalized === "1" || normalized === "true" || normalized === "yes";
}

function statusPageResponse(input: {
	request: Request;
	status: number;
	tag: string;
	title: string;
	description: string;
}) {
	return withServerSecurityHeaders(
		new Response(renderStatusPageHtml(input), {
			status: input.status,
			headers: {
				"cache-control": "no-store",
				"content-type": "text/html; charset=utf-8",
			},
		}),
		{
			request: input.request,
			referrerPolicy: "no-referrer",
		},
	);
}

function publicQrPageResponse(input: {
	request: Request;
	name: string;
	shortUrl: string;
	destinationUrl: string;
}) {
	return withServerSecurityHeaders(
		new Response(renderPublicQrPageHtml(input), {
			status: 200,
			headers: {
				"cache-control": "no-store",
				"content-type": "text/html; charset=utf-8",
			},
		}),
		{
			request: input.request,
			referrerPolicy: "no-referrer",
		},
	);
}

function renderStatusPageHtml(input: {
	status: number;
	tag: string;
	title: string;
	description: string;
}) {
	const escapedTag = escapeHtml(input.tag);
	const escapedTitle = escapeHtml(input.title);
	const escapedDescription = escapeHtml(input.description);
	const escapedStatus = escapeHtml(String(input.status));
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapedTitle} | Easy Access QR</title>
		<style>
			:root {
				color-scheme: dark;
			}
			* { box-sizing: border-box; }
			body {
				margin: 0;
				min-height: 100vh;
				display: grid;
				place-items: center;
				padding: 24px;
				font-family: "Sora", "Avenir Next", "Segoe UI", sans-serif;
				background:
					radial-gradient(circle at 16% 12%, rgba(58, 159, 156, 0.2), transparent 36%),
					radial-gradient(circle at 84% 88%, rgba(222, 99, 70, 0.14), transparent 42%),
					linear-gradient(135deg, #11181d 0%, #192127 52%, #121a20 100%);
				color: #edf4f4;
			}
			.shell {
				width: min(680px, 100%);
				border: 1px solid #3a474a;
				border-radius: 28px;
				background: linear-gradient(165deg, rgba(30, 40, 46, 0.96), rgba(24, 34, 40, 0.97));
				padding: 34px 30px;
				box-shadow:
					0 28px 90px rgba(0, 0, 0, 0.48),
					inset 0 1px 0 rgba(255, 255, 255, 0.05);
			}
			.brand {
				margin: 0;
				font-size: clamp(38px, 5vw, 48px);
				line-height: 1;
				font-weight: 800;
				letter-spacing: -0.03em;
				color: #de6346;
			}
			.status-row {
				margin-top: 20px;
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				gap: 10px;
			}
			.tag {
				display: inline-flex;
				align-items: center;
				gap: 8px;
				padding: 6px 12px;
				border-radius: 999px;
				border: 1px solid #445659;
				font-size: 12px;
				font-weight: 700;
				letter-spacing: 0.035em;
				text-transform: uppercase;
				color: #c9d7d8;
				background: rgba(67, 81, 86, 0.42);
			}
			.code {
				display: inline-flex;
				align-items: center;
				padding: 5px 12px;
				border-radius: 999px;
				border: 1px solid #4b5b5f;
				font-size: 12px;
				font-weight: 800;
				letter-spacing: 0.04em;
				text-transform: uppercase;
				color: #9fd8d4;
				background: rgba(62, 149, 145, 0.16);
			}
			h1 {
				margin: 16px 0 12px;
				font-size: clamp(30px, 4.2vw, 42px);
				line-height: 1.1;
				letter-spacing: -0.03em;
				color: #f0f6f6;
			}
			p {
				margin: 0;
				font-size: 18px;
				line-height: 1.55;
				color: #b7c5c6;
			}
			.actions {
				margin-top: 26px;
				display: flex;
				flex-wrap: wrap;
				gap: 12px;
			}
			.btn {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				height: 45px;
				padding: 0 18px;
				border-radius: 12px;
				text-decoration: none;
				font-size: 15px;
				font-weight: 700;
				border: 1px solid #49575a;
				color: #e3ecec;
				background: rgba(58, 70, 75, 0.4);
				transition: filter 140ms ease, background-color 140ms ease;
			}
			.btn.primary {
				border-color: #399794;
				background: #399794;
				color: #f3fbfb;
			}
			.btn:hover {
				filter: brightness(1.08);
			}
		</style>
	</head>
	<body>
		<main class="shell">
			<div class="brand">Easy Access QR</div>
			<div class="status-row">
				<div class="tag">${escapedTag}</div>
				<div class="code">Status ${escapedStatus}</div>
			</div>
			<h1>${escapedTitle}</h1>
			<p>${escapedDescription}</p>
			<div class="actions">
				<a class="btn primary" href="https://easyaccessqr.com">Visit easyaccessqr.com</a>
				<a class="btn" href="#" onclick="window.history.back(); return false;">Go back</a>
			</div>
		</main>
	</body>
</html>`;
}

function renderPublicQrPageHtml(input: {
	name: string;
	shortUrl: string;
	destinationUrl: string;
}) {
	const escapedName = escapeHtml(input.name);
	const escapedShortUrl = escapeHtml(input.shortUrl);
	const escapedDestinationUrl = escapeHtml(input.destinationUrl);
	const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=640x640&format=svg&ecc=Q&margin=12&data=${encodeURIComponent(input.shortUrl)}`;
	const escapedQrImageUrl = escapeHtml(qrImageUrl);

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapedName} | Easy Access QR</title>
		<style>
			:root {
				color-scheme: light dark;
				--bg-0: #edf2f1;
				--bg-1: #f7faf9;
				--bg-accent-a: rgba(47, 127, 124, 0.14);
				--bg-accent-b: rgba(222, 99, 70, 0.14);
				--surface: rgba(255, 255, 255, 0.94);
				--surface-soft: #f5f8f7;
				--border: #b7c7c1;
				--border-strong: #a9bcb5;
				--text: #1f2a2b;
				--text-muted: #4f6461;
				--accent: #2f7f7c;
				--accent-strong: #2d8b88;
				--brand: #de6346;
				--badge-bg: rgba(47, 127, 124, 0.08);
				--btn-bg: rgba(255, 255, 255, 0.7);
				--shadow: 0 24px 70px rgba(31, 42, 43, 0.14);
			}
			@media (prefers-color-scheme: dark) {
				:root {
					--bg-0: #11181d;
					--bg-1: #1a2329;
					--bg-accent-a: rgba(61, 168, 164, 0.18);
					--bg-accent-b: rgba(222, 99, 70, 0.12);
					--surface: rgba(29, 39, 45, 0.94);
					--surface-soft: rgba(35, 46, 53, 0.92);
					--border: #3a4a4d;
					--border-strong: #4a5d61;
					--text: #edf4f4;
					--text-muted: #b3c2c3;
					--accent: #5ac1bc;
					--accent-strong: #3b9a96;
					--brand: #e37055;
					--badge-bg: rgba(90, 193, 188, 0.12);
					--btn-bg: rgba(31, 44, 51, 0.55);
					--shadow: 0 30px 85px rgba(0, 0, 0, 0.45);
				}
			}
			* { box-sizing: border-box; }
			body {
				margin: 0;
				min-height: 100vh;
				padding: 24px;
				display: grid;
				place-items: center;
				font-family: "Sora", "Avenir Next", "Segoe UI", sans-serif;
				background:
					radial-gradient(circle at top left, var(--bg-accent-a), transparent 38%),
					radial-gradient(circle at bottom right, var(--bg-accent-b), transparent 42%),
					linear-gradient(165deg, var(--bg-1), var(--bg-0));
				color: var(--text);
			}
			.shell {
				width: min(980px, 100%);
				border: 1px solid var(--border);
				border-radius: 26px;
				background: var(--surface);
				padding: 24px;
				box-shadow: var(--shadow);
				backdrop-filter: blur(6px);
			}
			.header {
				display: flex;
				flex-wrap: wrap;
				align-items: end;
				justify-content: space-between;
				gap: 10px;
			}
			.brand {
				margin: 0;
				font-size: clamp(34px, 4.2vw, 48px);
				line-height: 1;
				font-weight: 800;
				letter-spacing: -0.03em;
				color: var(--brand);
			}
			.subtitle {
				margin: 10px 0 0;
				font-size: 15px;
				color: var(--text-muted);
			}
			.badge {
				display: inline-flex;
				align-items: center;
				padding: 6px 11px;
				border-radius: 999px;
				border: 1px solid var(--border-strong);
				font-size: 11px;
				font-weight: 700;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				color: var(--accent);
				background: var(--badge-bg);
			}
			.layout {
				margin-top: 18px;
				display: grid;
				gap: 18px;
				grid-template-columns: minmax(0, 1fr);
			}
			@media (min-width: 880px) {
				.layout {
					grid-template-columns: minmax(0, 430px) minmax(0, 1fr);
					align-items: start;
				}
			}
			.preview {
				border: 1px solid var(--border);
				border-radius: 18px;
				padding: 14px;
				background: var(--surface-soft);
			}
			.preview img {
				display: block;
				width: 100%;
				aspect-ratio: 1/1;
				height: auto;
				background: #fff;
				border-radius: 14px;
				border: 1px solid var(--border);
			}
			.meta {
				border: 1px solid var(--border);
				border-radius: 18px;
				padding: 18px;
				background: var(--surface-soft);
			}
			.meta h1 {
				margin: 0 0 12px;
				font-size: clamp(30px, 3.6vw, 52px);
				line-height: 1.1;
				letter-spacing: -0.03em;
				color: var(--text);
			}
			.label {
				font-size: 12px;
				text-transform: uppercase;
				letter-spacing: 0.04em;
				color: var(--text-muted);
				font-weight: 700;
				margin: 14px 0 6px;
			}
			.value {
				margin: 0;
				font-size: 15px;
				line-height: 1.5;
				color: var(--text);
				word-break: break-word;
			}
			.value a {
				color: var(--accent);
				font-weight: 700;
				text-decoration: none;
			}
			.value a:hover {
				text-decoration: underline;
			}
			.actions {
				margin-top: 18px;
				display: flex;
				flex-wrap: wrap;
				gap: 10px;
			}
			.btn {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				height: 42px;
				padding: 0 16px;
				border-radius: 12px;
				text-decoration: none;
				font-size: 14px;
				font-weight: 700;
				border: 1px solid var(--border-strong);
				color: var(--text);
				background: var(--btn-bg);
				transition: filter 130ms ease, background-color 130ms ease;
			}
			.btn.primary {
				border-color: var(--accent-strong);
				background: var(--accent-strong);
				color: #f7fcfc;
			}
			.btn:hover {
				filter: brightness(1.06);
			}
		</style>
	</head>
	<body>
		<main class="shell">
			<header class="header">
				<div>
					<h2 class="brand">Easy Access QR</h2>
					<p class="subtitle">Public QR page</p>
				</div>
				<span class="badge">Shared QR</span>
			</header>
			<div class="layout">
				<div class="preview">
					<img src="${escapedQrImageUrl}" alt="QR code for ${escapedName}" />
				</div>
				<section class="meta">
					<h1>${escapedName}</h1>
					<div class="label">Tracked short link</div>
					<p class="value"><a href="${escapedShortUrl}" target="_blank" rel="noreferrer">${escapedShortUrl}</a></p>
					<div class="label">Primary destination</div>
					<p class="value"><a href="${escapedDestinationUrl}" target="_blank" rel="noreferrer">${escapedDestinationUrl}</a></p>
					<div class="actions">
						<a class="btn primary" href="${escapedShortUrl}" target="_blank" rel="noreferrer">Open tracked link</a>
						<a class="btn" href="https://easyaccessqr.com" target="_blank" rel="noreferrer">Visit Easy Access QR</a>
					</div>
				</section>
			</div>
		</main>
	</body>
</html>`;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function buildDestinationUrl(request: Request, destinationUrl: string) {
	try {
		const destination = new URL(destinationUrl);
		if (destination.protocol !== "https:" && destination.protocol !== "http:") {
			return null;
		}
		const source = new URL(request.url);
		const blockedQueryParamKeys = new Set(["view", "preview", "qr"]);
		let appendedCount = 0;
		for (const [key, value] of source.searchParams.entries()) {
			if (blockedQueryParamKeys.has(key.toLowerCase())) continue;
			if (key.length > 128 || value.length > 512) continue;
			if (appendedCount >= 24) break;
			destination.searchParams.append(key, value);
			appendedCount += 1;
		}
		return destination.toString();
	} catch {
		return null;
	}
}

function getRandomUnit() {
	try {
		const bytes = new Uint32Array(1);
		crypto.getRandomValues(bytes);
		return (bytes[0] ?? 0) / 2 ** 32;
	} catch {
		return Math.random();
	}
}

function detectDeviceType(userAgent: string | null) {
	if (!userAgent) return "unknown" as const;
	const ua = userAgent.toLowerCase();
	if (ua.includes("bot") || ua.includes("spider") || ua.includes("crawler")) {
		return "bot" as const;
	}
	if (ua.includes("ipad") || ua.includes("tablet")) {
		return "tablet" as const;
	}
	if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
		return "mobile" as const;
	}
	return "desktop" as const;
}

function readHeader(headers: Headers, names: string[]) {
	for (const name of names) {
		const value = headers.get(name);
		if (value?.trim()) return value.trim();
	}
	return undefined;
}

function getForwardedIp(headers: Headers) {
	const forwarded = headers.get("x-forwarded-for");
	if (!forwarded) return undefined;
	const [first] = forwarded.split(",");
	const candidate = first?.trim();
	return sanitizeIpAddress(candidate);
}

let didWarnAboutMissingIpSalt = false;

async function hashIpAddress(ipAddress: string | undefined) {
	if (!ipAddress) return undefined;
	const salt = (process.env.QR_IP_HASH_SALT ?? "").trim();
	if (salt.length < 16) {
		if (!didWarnAboutMissingIpSalt) {
			didWarnAboutMissingIpSalt = true;
			console.warn(
				"[qr-redirect] QR_IP_HASH_SALT is missing or too short. IP hash capture is disabled.",
			);
		}
		return undefined;
	}
	const value = `${salt}:${ipAddress}`;
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 64);
}

async function extractScanPayload(request: Request) {
	const userAgent = sanitizePlainText(request.headers.get("user-agent"), 512);
	const referrer = sanitizeReferrer(request.headers.get("referer"));
	const ipAddress =
		getForwardedIp(request.headers) ??
		sanitizeIpAddress(request.headers.get("x-real-ip")) ??
		undefined;

	return {
		scannedAt: new Date(),
		referrer,
		userAgent,
		ipHash: await hashIpAddress(ipAddress),
		country:
			sanitizeLocationText(
				readHeader(request.headers, [
					"x-vercel-ip-country",
					"cf-ipcountry",
					"x-country",
				]),
			) ?? undefined,
		city:
			sanitizeLocationText(
				readHeader(request.headers, ["x-vercel-ip-city", "x-city"]),
			) ?? undefined,
		deviceType: detectDeviceType(userAgent ?? null),
	};
}

function sanitizePlainText(value: string | null, maxLength: number) {
	if (!value) return undefined;
	const cleaned = Array.from(value)
		.filter((character) => {
			const codePoint = character.charCodeAt(0);
			return codePoint >= 32 && codePoint !== 127;
		})
		.join("")
		.trim();
	if (!cleaned) return undefined;
	return cleaned.slice(0, maxLength);
}

function sanitizeReferrer(value: string | null) {
	const cleaned = sanitizePlainText(value, 2048);
	if (!cleaned) return undefined;
	try {
		const parsed = new URL(cleaned);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
			return undefined;
		}
		return `${parsed.origin}${parsed.pathname}`;
	} catch {
		return undefined;
	}
}

function sanitizeLocationText(value: string | undefined) {
	if (!value) return undefined;
	const cleaned = value.replace(/[^a-zA-Z0-9 .,'-]/g, "").trim();
	if (!cleaned) return undefined;
	return cleaned.slice(0, 80);
}

function sanitizeIpAddress(value: string | null | undefined) {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	const bracketMatch = /^\[([0-9a-fA-F:]+)](?::\d+)?$/.exec(trimmed);
	const normalizedCandidate = bracketMatch?.[1] ?? trimmed;
	const ipv4WithPortMatch = /^(\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?$/.exec(
		normalizedCandidate,
	);
	const candidate = ipv4WithPortMatch?.[1] ?? normalizedCandidate;

	if (/^(\d{1,3}\.){3}\d{1,3}$/.test(candidate)) {
		const segments = candidate.split(".").map((part) => Number(part));
		const isValidIpv4 = segments.every(
			(segment) => Number.isInteger(segment) && segment >= 0 && segment <= 255,
		);
		return isValidIpv4 ? candidate : undefined;
	}

	if (
		candidate.includes(":") &&
		candidate.length <= 45 &&
		/^[0-9a-fA-F:]+$/.test(candidate)
	) {
		return candidate.toLowerCase();
	}

	return undefined;
}

async function trackScan(input: {
	qrCodeId: number;
	organizationId: string;
	selectedDestinationId?: string;
	selectedDestinationUrl?: string;
	scannedAt: Date;
	referrer?: string;
	userAgent?: string;
	ipHash?: string;
	country?: string;
	city?: string;
	deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
}) {
	try {
		const [{ db }, { qrCode, qrScanEvent }, { eq, sql }] = await Promise.all([
			import("@/db"),
			import("@/db/schema"),
			import("drizzle-orm"),
		]);
		await db.transaction(async (tx) => {
			await tx.insert(qrScanEvent).values({
				qrCodeId: input.qrCodeId,
				organizationId: input.organizationId,
				scannedAt: input.scannedAt,
				referrer: input.referrer,
				userAgent: input.userAgent,
				ipHash: input.ipHash,
				selectedDestinationId: input.selectedDestinationId,
				selectedDestinationUrl: input.selectedDestinationUrl,
				country: input.country,
				city: input.city,
				deviceType: input.deviceType,
			});

			await tx
				.update(qrCode)
				.set({
					scanCount: sql`${qrCode.scanCount} + 1`,
					lastScannedAt: input.scannedAt,
					updatedAt: input.scannedAt,
				})
				.where(eq(qrCode.id, input.qrCodeId));
		});
	} catch (error) {
		console.error("[qr-redirect] failed to track scan", error);
	}
}
