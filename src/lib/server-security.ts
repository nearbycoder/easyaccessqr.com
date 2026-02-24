type ServerSecurityHeaderOptions = {
	request?: Request;
	cacheControl?: string;
	frameOptions?: "DENY" | "SAMEORIGIN" | null;
	referrerPolicy?: string;
	permissionsPolicy?: string;
};

function parseCsvEnv(value?: string): string[] {
	return (value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function normalizeOrigin(value: string): string | null {
	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

export function getTrustedOriginsForRequest(request: Request): Set<string> {
	const selfOrigin = new URL(request.url).origin;
	const processEnv = typeof process !== "undefined" ? process.env : undefined;
	const rawOrigins = [
		selfOrigin,
		...parseCsvEnv(processEnv?.BETTER_AUTH_URL),
		...parseCsvEnv(processEnv?.BETTER_AUTH_TRUSTED_ORIGINS),
	];
	return new Set(
		rawOrigins
			.map((raw) => normalizeOrigin(raw) ?? raw)
			.filter((origin) => origin.length > 0),
	);
}

export function hasTrustedBrowserOrigin(
	request: Request,
	options?: { allowNoOrigin?: boolean },
): boolean {
	const trustedOrigins = getTrustedOriginsForRequest(request);
	const requestOriginHeader = request.headers.get("origin")?.trim();
	if (requestOriginHeader) {
		const normalizedOrigin =
			normalizeOrigin(requestOriginHeader) ?? requestOriginHeader;
		return trustedOrigins.has(normalizedOrigin);
	}

	const refererHeader = request.headers.get("referer")?.trim();
	if (refererHeader) {
		const refererOrigin = normalizeOrigin(refererHeader);
		return refererOrigin !== null && trustedOrigins.has(refererOrigin);
	}

	return options?.allowNoOrigin ?? true;
}

export function contentTypeIsJson(request: Request): boolean {
	const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
	return contentType.includes("application/json");
}

export function withServerSecurityHeaders(
	response: Response,
	options?: ServerSecurityHeaderOptions,
): Response {
	const headers = new Headers(response.headers);
	const requestProtocol = options?.request
		? new URL(options.request.url).protocol
		: null;

	if (!headers.has("x-content-type-options")) {
		headers.set("x-content-type-options", "nosniff");
	}
	if (!headers.has("referrer-policy")) {
		headers.set(
			"referrer-policy",
			options?.referrerPolicy ?? "strict-origin-when-cross-origin",
		);
	}
	if (!headers.has("permissions-policy")) {
		headers.set(
			"permissions-policy",
			options?.permissionsPolicy ??
				"camera=(), microphone=(), geolocation=(), payment=()",
		);
	}

	const frameOptions = options?.frameOptions ?? "DENY";
	if (frameOptions && !headers.has("x-frame-options")) {
		headers.set("x-frame-options", frameOptions);
	}

	if (
		requestProtocol === "https:" &&
		!headers.has("strict-transport-security")
	) {
		headers.set(
			"strict-transport-security",
			"max-age=31536000; includeSubDomains",
		);
	}

	if (options?.cacheControl && !headers.has("cache-control")) {
		headers.set("cache-control", options.cacheControl);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
