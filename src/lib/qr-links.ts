export function slugifyQrName(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 80);
}

export function buildQrShortPath(organizationSlug: string, qrSlug: string) {
	const org = organizationSlug.trim();
	const slug = qrSlug.trim();
	if (!org || !slug) return "";
	return `/r/${org}/${slug}`;
}

export function toAbsoluteUrl(pathOrUrl: string) {
	if (!pathOrUrl) return "";
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	if (typeof window === "undefined") return pathOrUrl;
	return `${window.location.origin}${pathOrUrl}`;
}
