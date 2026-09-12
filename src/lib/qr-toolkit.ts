export const toolkitTypes = [
	["wifi", "Wi-Fi"],
	["contact", "Contact card"],
	["email", "Email"],
	["sms", "SMS"],
	["phone", "Phone call"],
	["location", "Map location"],
	["text", "Plain text"],
	["whatsapp", "WhatsApp"],
	["campaign", "Campaign URL"],
] as const;
export type ToolkitType = (typeof toolkitTypes)[number][0];
export type ToolkitFields = Record<string, string>;

function required(value: string | undefined, label: string) {
	if (!value?.trim()) throw new Error(`${label} is required.`);
	return value;
}
function phone(value: string | undefined) {
	const normalized = required(value, "Phone number").replace(/[\s().-]/g, "");
	if (!/^\+[1-9]\d{6,14}$/.test(normalized))
		throw new Error(
			"Use an international phone number, such as +1 212 555 0123.",
		);
	return normalized;
}
function email(value: string | undefined) {
	const address = required(value, "Email address").trim();
	if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(address))
		throw new Error("Enter a valid email address.");
	return address;
}
export function httpUrl(value: string) {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error("Enter a complete HTTP or HTTPS URL.");
	}
	if (
		!["http:", "https:"].includes(url.protocol) ||
		url.username ||
		url.password
	)
		throw new Error("Use an HTTP or HTTPS URL without embedded credentials.");
	return url;
}
export function cleanTrackingUrl(value: string) {
	const url = httpUrl(value);
	for (const key of [...url.searchParams.keys()]) {
		if (
			/^utm_/i.test(key) ||
			["fbclid", "gclid", "dclid", "msclkid", "mc_cid", "mc_eid"].includes(
				key.toLowerCase(),
			)
		)
			url.searchParams.delete(key);
	}
	return url.toString();
}
export function campaignUrl(fields: ToolkitFields) {
	const url = httpUrl(required(fields.url, "Destination URL"));
	for (const key of ["source", "medium", "campaign", "term", "content"]) {
		const value = fields[key]?.trim();
		if (["source", "medium", "campaign"].includes(key))
			required(value, `Campaign ${key}`);
		if (value) url.searchParams.set(`utm_${key}`, value);
		else url.searchParams.delete(`utm_${key}`);
	}
	return url.toString();
}
const wifiEscape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
const cardEscape = (value: string) =>
	value
		.replace(/\\/g, "\\\\")
		.replace(/\r\n|\r|\n/g, "\\n")
		.replace(/[,;]/g, "\\$&");
// vCard lines are folded on UTF-8 octet boundaries, never within a code point.
function foldCardLine(line: string) {
	let result = "",
		length = 0;
	for (const character of line) {
		const size = new TextEncoder().encode(character).length;
		if (length + size > 75) {
			result += "\r\n ";
			length = 1;
		}
		result += character;
		length += size;
	}
	return result;
}
export function buildToolkitPayload(
	type: ToolkitType,
	fields: ToolkitFields,
): string {
	let payload: string;
	switch (type) {
		case "wifi": {
			const ssid = required(fields.ssid, "Network name");
			const security = fields.security || "WPA";
			if (!["WPA", "WEP", "nopass"].includes(security))
				throw new Error("Choose a supported Wi-Fi security type.");
			if (new TextEncoder().encode(ssid).length > 32)
				throw new Error("Network names must fit within 32 UTF-8 bytes.");
			if (security !== "nopass") required(fields.password, "Network password");
			payload = `WIFI:T:${security};S:${wifiEscape(ssid)};P:${security === "nopass" ? "" : wifiEscape(fields.password || "")};H:${fields.hidden === "true"};;`;
			break;
		}
		case "contact": {
			const name = required(fields.name, "Full name");
			payload = `${[
				"BEGIN:VCARD",
				"VERSION:4.0",
				`FN:${cardEscape(name)}`,
				fields.organization ? `ORG:${cardEscape(fields.organization)}` : "",
				fields.phone ? `TEL;VALUE=uri:tel:${phone(fields.phone)}` : "",
				fields.email ? `EMAIL:${cardEscape(email(fields.email))}` : "",
				fields.url ? `URL:${httpUrl(fields.url).toString()}` : "",
				"END:VCARD",
			]
				.filter(Boolean)
				.map(foldCardLine)
				.join("\r\n")}\r\n`;
			break;
		}
		case "email":
			payload = `mailto:${encodeURIComponent(email(fields.email)).replace("%40", "@")}?subject=${encodeURIComponent(fields.subject || "")}&body=${encodeURIComponent(fields.message || "")}`;
			break;
		case "sms":
			payload = `sms:${phone(fields.phone)}?body=${encodeURIComponent(fields.message || "")}`;
			break;
		case "phone":
			payload = `tel:${phone(fields.phone)}`;
			break;
		case "whatsapp":
			payload = `https://wa.me/${phone(fields.phone).slice(1)}?text=${encodeURIComponent(fields.message || "")}`;
			break;
		case "location": {
			const lat = Number(required(fields.latitude, "Latitude"));
			const lng = Number(required(fields.longitude, "Longitude"));
			if (
				!Number.isFinite(lat) ||
				!Number.isFinite(lng) ||
				Math.abs(lat) > 90 ||
				Math.abs(lng) > 180
			)
				throw new Error(
					"Latitude must be −90 to 90 and longitude −180 to 180.",
				);
			payload = `geo:${lat},${lng}`;
			break;
		}
		case "text":
			payload = required(fields.text, "Text");
			break;
		case "campaign":
			payload = campaignUrl(fields);
			break;
	}
	if (new TextEncoder().encode(payload).length > 1600)
		throw new Error(
			"This content is too long for a reliable QR code. Shorten it to 1,600 UTF-8 bytes or fewer.",
		);
	return payload;
}
