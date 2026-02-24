import { createFileRoute } from "@tanstack/react-router";
import {
	normalizeQrDestinations,
	pickWeightedDestination,
} from "@/lib/qr-destinations";

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
						organizationId: true,
						destinationUrl: true,
						destinations: true,
						isActive: true,
					},
				});

				if (!code) {
					return statusPageResponse({
						status: 404,
						tag: "Link not found",
						title: "This QR link does not exist",
						description:
							"The link may be incorrect, expired, or removed by the organization owner.",
					});
				}

				if (!code.isActive) {
					return statusPageResponse({
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

				return new Response(null, {
					status: 302,
					headers: {
						location: destination,
						"cache-control": "no-store",
					},
				});
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

function statusPageResponse(input: {
	status: number;
	tag: string;
	title: string;
	description: string;
}) {
	return new Response(renderStatusPageHtml(input), {
		status: input.status,
		headers: {
			"cache-control": "no-store",
			"content-type": "text/html; charset=utf-8",
		},
	});
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
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>${escapedTitle} | Easy Access QR</title>
		<style>
			:root {
				color-scheme: light;
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
					radial-gradient(circle at top right, rgba(55, 138, 136, 0.14), transparent 40%),
					radial-gradient(circle at bottom left, rgba(222, 99, 70, 0.16), transparent 38%),
					#f6f8f7;
				color: #1f2a2b;
			}
			.shell {
				width: min(640px, 100%);
				border: 1px solid #b7c7c1;
				border-radius: 24px;
				background: #ffffff;
				padding: 36px 32px;
				box-shadow: 0 22px 70px rgba(31, 42, 43, 0.12);
			}
			.brand {
				margin: 0 0 20px;
				font-size: 34px;
				line-height: 1;
				font-weight: 800;
				letter-spacing: -0.03em;
				color: #de6346;
			}
			.tag {
				display: inline-flex;
				align-items: center;
				gap: 8px;
				padding: 6px 12px;
				border-radius: 999px;
				border: 1px solid #b7c7c1;
				font-size: 12px;
				font-weight: 700;
				letter-spacing: 0.03em;
				text-transform: uppercase;
				color: #3a5051;
				background: #edf4f2;
			}
			h1 {
				margin: 16px 0 12px;
				font-size: clamp(30px, 4.2vw, 42px);
				line-height: 1.08;
				letter-spacing: -0.03em;
			}
			p {
				margin: 0;
				font-size: 18px;
				line-height: 1.55;
				color: #4f6461;
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
				height: 44px;
				padding: 0 18px;
				border-radius: 12px;
				text-decoration: none;
				font-size: 15px;
				font-weight: 700;
				border: 1px solid #b7c7c1;
				color: #243435;
				background: #ffffff;
			}
			.btn.primary {
				border-color: #2e8986;
				background: #2e8986;
				color: #f8ffff;
			}
		</style>
	</head>
	<body>
		<main class="shell">
			<div class="brand">Easy Access QR</div>
			<div class="tag">${escapedTag}</div>
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
		for (const [key, value] of source.searchParams.entries()) {
			destination.searchParams.append(key, value);
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
	return first?.trim() || undefined;
}

async function hashIpAddress(ipAddress: string | undefined) {
	if (!ipAddress) return undefined;
	const salt = process.env.QR_IP_HASH_SALT ?? "";
	const value = `${salt}:${ipAddress}`;
	const encoded = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 64);
}

async function extractScanPayload(request: Request) {
	const userAgent = request.headers.get("user-agent")?.trim() || undefined;
	const referrer = request.headers.get("referer")?.trim() || undefined;
	const ipAddress =
		getForwardedIp(request.headers) ??
		request.headers.get("x-real-ip")?.trim() ??
		undefined;

	return {
		scannedAt: new Date(),
		referrer,
		userAgent,
		ipHash: await hashIpAddress(ipAddress),
		country:
			readHeader(request.headers, [
				"x-vercel-ip-country",
				"cf-ipcountry",
				"x-country",
			]) ?? undefined,
		city:
			readHeader(request.headers, ["x-vercel-ip-city", "x-city"]) ?? undefined,
		deviceType: detectDeviceType(userAgent ?? null),
	};
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
