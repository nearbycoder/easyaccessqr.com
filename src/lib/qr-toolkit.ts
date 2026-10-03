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
	["website", "Website"],
	["event", "Calendar event"],
	["place", "Place or address"],
	["social", "Social profile"],
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
		case "website":
			payload = httpUrl(required(fields.url, "Website URL")).toString();
			break;
		case "place": {
			const url = new URL("https://www.google.com/maps/search/");
			url.searchParams.set("api", "1");
			url.searchParams.set(
				"query",
				required(fields.address, "Place or address").trim(),
			);
			payload = url.toString();
			break;
		}
		case "social": {
			const origins: Record<string, string> = {
				instagram: "https://www.instagram.com/",
				tiktok: "https://www.tiktok.com/@",
				x: "https://x.com/",
				github: "https://github.com/",
				linkedin: "https://www.linkedin.com/in/",
			};
			const origin = origins[fields.platform || "instagram"];
			const handle = required(fields.handle, "Profile handle")
				.trim()
				.replace(/^@/, "");
			if (!origin || !/^[a-zA-Z0-9_.-]{1,100}$/.test(handle))
				throw new Error(
					"Choose a platform and enter a handle without spaces or slashes.",
				);
			payload = `${origin}${encodeURIComponent(handle)}`;
			break;
		}
		case "event": {
			// Explicit UTC inputs make exported events independent of browser time zones.
			const parseDate = (value: string | undefined, label: string) => {
				const input = required(value, label);
				if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
					throw new Error(`Enter a valid ${label.toLowerCase()} in UTC.`);
				const date = new Date(`${input}:00Z`);
				if (
					!Number.isFinite(date.getTime()) ||
					date.toISOString().slice(0, 16) !== input
				)
					throw new Error(`Enter a valid ${label.toLowerCase()} in UTC.`);
				return date;
			};
			const start = parseDate(fields.start, "Start time");
			const end = parseDate(fields.end, "End time");
			if (end <= start) throw new Error("End time must be after start time.");
			const stamp = (date: Date) =>
				date
					.toISOString()
					.replace(/[-:]/g, "")
					.replace(/\.\d{3}Z$/, "Z");
			payload = `${[
				"BEGIN:VEVENT",
				`DTSTART:${stamp(start)}`,
				`DTEND:${stamp(end)}`,
				`SUMMARY:${cardEscape(required(fields.name, "Event title"))}`,
				fields.address ? `LOCATION:${cardEscape(fields.address)}` : "",
				fields.message ? `DESCRIPTION:${cardEscape(fields.message)}` : "",
				"END:VEVENT",
			]
				.filter(Boolean)
				.map(foldCardLine)
				.join("\r\n")}\r\n`;
			break;
		}
	}
	if (new TextEncoder().encode(payload).length > 1600)
		throw new Error(
			"This content is too long for a reliable QR code. Shorten it to 1,600 UTF-8 bytes or fewer.",
		);
	return payload;
}
