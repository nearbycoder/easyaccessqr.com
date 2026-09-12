import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { QrToolkitPreview } from "@/components/qr/qr-toolkit-preview";
import {
	buildToolkitPayload,
	cleanTrackingUrl,
	type ToolkitFields,
	type ToolkitType,
	toolkitTypes,
} from "@/lib/qr-toolkit";

export const Route = createFileRoute("/app/toolkit")({
	component: ToolkitPage,
});
const fieldDefinitions: Record<
	ToolkitType,
	Array<[string, string, string?]>
> = {
	wifi: [
		["ssid", "Network name"],
		["password", "Network password", "password"],
	],
	contact: [
		["name", "Full name"],
		["organization", "Company (optional)"],
		["phone", "Phone number (optional)", "tel"],
		["email", "Email address (optional)", "email"],
		["url", "Website (optional)", "url"],
	],
	email: [
		["email", "Email address", "email"],
		["subject", "Subject"],
		["message", "Message", "textarea"],
	],
	sms: [
		["phone", "Phone number", "tel"],
		["message", "Message", "textarea"],
	],
	phone: [["phone", "Phone number", "tel"]],
	location: [
		["latitude", "Latitude"],
		["longitude", "Longitude"],
	],
	text: [["text", "Text", "textarea"]],
	whatsapp: [
		["phone", "Phone number", "tel"],
		["message", "Message", "textarea"],
	],
	campaign: [
		["url", "Destination URL", "url"],
		["source", "Campaign source"],
		["medium", "Campaign medium"],
		["campaign", "Campaign name"],
		["term", "Term (optional)"],
		["content", "Content (optional)"],
	],
};
function ToolkitPage() {
	const [type, setType] = useState<ToolkitType>("wifi");
	const [fields, setFields] = useState<ToolkitFields>({
		security: "WPA",
		medium: "qr",
	});
	const [title, setTitle] = useState("Scan me");
	const [caption, setCaption] = useState("Point your camera at the QR code");
	let payload = "",
		error = "";
	try {
		payload = buildToolkitPayload(type, fields);
	} catch (cause) {
		error = cause instanceof Error ? cause.message : "Check the content.";
	}
	const update = (key: string, value: string) =>
		setFields((current) => ({ ...current, [key]: value }));
	return (
		<div className="mx-auto w-full max-w-[1320px] space-y-6">
			<header>
				<h1 className="text-2xl font-semibold tracking-tight">QR toolkit</h1>
				<p className="mt-2 max-w-2xl text-sm text-ds-text-secondary">
					Create ready-to-print QR cards for everyday connections. These static
					codes contain your content directly; they do not expire, track scans,
					or change after printing.
				</p>
			</header>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<section className="space-y-5 rounded-xl border border-ds-border bg-ds-surface p-5 sm:p-6">
					<div className="border-b border-ds-border pb-4">
						<h2 className="text-base font-semibold">QR content</h2>
						<p className="mt-1 text-sm text-ds-text-tertiary">
							Choose a type and add the details to encode.
						</p>
					</div>
					<label className="toolkit-label">
						QR type
						<select
							className="toolkit-input"
							value={type}
							onChange={(event) => {
								setType(event.target.value as ToolkitType);
								setFields({ security: "WPA", medium: "qr" });
							}}
						>
							{toolkitTypes.map(([value, label]) => (
								<option value={value} key={value}>
									{label}
								</option>
							))}
						</select>
					</label>
					{type === "wifi" ? (
						<>
							<label className="toolkit-label">
								Security
								<select
									className="toolkit-input"
									value={fields.security}
									onChange={(event) => update("security", event.target.value)}
								>
									<option value="WPA">WPA / WPA2 / WPA3 personal</option>
									<option value="WEP">WEP</option>
									<option value="nopass">Open network</option>
								</select>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={fields.hidden === "true"}
									onChange={(event) =>
										update("hidden", String(event.target.checked))
									}
								/>
								Hidden network
							</label>
						</>
					) : null}
					{fieldDefinitions[type]
						.filter(
							([key]) =>
								!(
									type === "wifi" &&
									key === "password" &&
									fields.security === "nopass"
								),
						)
						.map(([key, label, inputType]) => (
							<label
								key={key}
								htmlFor={`toolkit-${key}`}
								className="toolkit-label"
							>
								{label}
								{inputType === "textarea" ? (
									<textarea
										id={`toolkit-${key}`}
										className="toolkit-input min-h-28"
										maxLength={1600}
										value={fields[key] || ""}
										onChange={(event) => update(key, event.target.value)}
									/>
								) : (
									<input
										id={`toolkit-${key}`}
										className="toolkit-input"
										type={inputType || "text"}
										maxLength={1600}
										autoComplete="off"
										value={fields[key] || ""}
										onChange={(event) => update(key, event.target.value)}
									/>
								)}
							</label>
						))}
					{["phone", "sms", "whatsapp", "contact"].includes(type) ? (
						<p className="text-xs text-ds-text-secondary">
							Include the country code, for example +1 212 555 0123.
						</p>
					) : null}
					{type === "wifi" ? (
						<p className="text-xs text-ds-text-secondary">
							The QR contains the network password. Share it only with people
							who should have access.
						</p>
					) : null}
					{type === "campaign" ? (
						<>
							<button
								type="button"
								className="toolkit-button"
								onClick={() => {
									try {
										update("url", cleanTrackingUrl(fields.url || ""));
										toast.success(
											"Tracking parameters removed from destination",
										);
									} catch (cause) {
										toast.error((cause as Error).message);
									}
								}}
							>
								Clean tracking parameters
							</button>
							<p className="text-xs text-ds-text-secondary">
								Keeps other query parameters and anchors. Copy the completed URL
								into a managed QR destination to track scans and update the
								target later.
							</p>
						</>
					) : null}
					{error ? (
						<p role="status" className="text-sm text-ds-text-secondary">
							{error}
						</p>
					) : null}
					<div className="space-y-4 border-t border-ds-border pt-5">
						<h2 className="font-semibold">Print card</h2>
						<label className="toolkit-label">
							Card heading
							<input
								className="toolkit-input"
								maxLength={80}
								value={title}
								onChange={(event) => setTitle(event.target.value)}
							/>
						</label>
						<label className="toolkit-label">
							Card caption
							<textarea
								className="toolkit-input"
								maxLength={240}
								value={caption}
								onChange={(event) => setCaption(event.target.value)}
							/>
						</label>
					</div>
				</section>
				<QrToolkitPreview data={payload} title={title} caption={caption} />
			</div>
		</div>
	);
}
