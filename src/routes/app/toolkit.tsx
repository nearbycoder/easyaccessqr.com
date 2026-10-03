import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CampaignTools } from "@/components/qr/campaign-tools";
import { QrToolkitPreview } from "@/components/qr/qr-toolkit-preview";
import { ToolkitDrafts } from "@/components/qr/toolkit-drafts";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
	buildToolkitPayload,
	type ToolkitFields,
	type ToolkitType,
	toolkitTypes,
} from "@/lib/qr-toolkit";
import {
	defaultToolkitDesign,
	designContrast,
	designPresets,
	type ToolkitDesign,
} from "@/lib/qr-workspace";

export const Route = createFileRoute("/app/toolkit")({
	component: ToolkitPage,
});
const fieldDefinitions: Record<
	ToolkitType,
	Array<[string, string, string?]>
> = {
	website: [["url", "Website URL", "url"]],
	event: [
		["name", "Event title"],
		["start", "Start time (UTC)", "datetime-local"],
		["end", "End time (UTC)", "datetime-local"],
		["address", "Event location (optional)"],
		["message", "Event description (optional)", "textarea"],
	],
	place: [["address", "Place or address"]],
	social: [["handle", "Profile handle"]],
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
		platform: "instagram",
	});
	const [title, setTitle] = useState("Scan me");
	const [caption, setCaption] = useState("Point your camera at the QR code");
	const [design, setDesign] = useState<ToolkitDesign>(defaultToolkitDesign);
	const { data: session } = authClient.useSession();
	const scope = `${session?.user.id || ""}:${session?.session.activeOrganizationId || ""}`;
	const { payload, error } = useMemo(() => {
		try {
			return { payload: buildToolkitPayload(type, fields), error: "" };
		} catch (cause) {
			return {
				payload: "",
				error: cause instanceof Error ? cause.message : "Check the content.",
			};
		}
	}, [type, fields]);
	const contrast = designContrast(design);
	const update = (key: string, value: string) =>
		setFields((current) => ({ ...current, [key]: value }));
	return (
		<div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">QR toolkit</h1>
					<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
						Turn a connection into a ready-to-print card. Create content,
						fine-tune the design, and export your QR.
					</p>
				</div>
				<Badge variant="secondary">13 content types</Badge>
			</header>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<div className="flex min-w-0 flex-col gap-5">
					<Card>
						<CardHeader>
							<CardTitle>QR content</CardTitle>
							<CardDescription>
								Choose what happens when someone scans your code.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="toolkit-type">QR type</FieldLabel>
									<NativeSelect
										id="toolkit-type"
										value={type}
										onChange={(event) => {
											setType(event.target.value as ToolkitType);
											setFields({
												security: "WPA",
												medium: "qr",
												platform: "instagram",
											});
										}}
									>
										{toolkitTypes.map(([value, label]) => (
											<option value={value} key={value}>
												{label}
											</option>
										))}
									</NativeSelect>
								</Field>
								{type === "wifi" ? (
									<>
										<Field>
											<FieldLabel htmlFor="toolkit-security">
												Security
											</FieldLabel>
											<NativeSelect
												id="toolkit-security"
												value={fields.security || "WPA"}
												onChange={(event) =>
													update("security", event.target.value)
												}
											>
												<option value="WPA">WPA / WPA2 / WPA3 personal</option>
												<option value="WEP">WEP</option>
												<option value="nopass">Open network</option>
											</NativeSelect>
										</Field>
										<Field orientation="horizontal">
											<input
												id="toolkit-hidden"
												type="checkbox"
												checked={fields.hidden === "true"}
												onChange={(event) =>
													update("hidden", String(event.target.checked))
												}
											/>
											<FieldLabel htmlFor="toolkit-hidden">
												Hidden network
											</FieldLabel>
										</Field>
									</>
								) : null}
								{type === "social" ? (
									<Field>
										<FieldLabel htmlFor="toolkit-platform">
											Social platform
										</FieldLabel>
										<NativeSelect
											id="toolkit-platform"
											value={fields.platform || "instagram"}
											onChange={(event) =>
												update("platform", event.target.value)
											}
										>
											{["instagram", "tiktok", "x", "github", "linkedin"].map(
												(platform) => (
													<option value={platform} key={platform}>
														{
															{
																instagram: "Instagram",
																tiktok: "TikTok",
																x: "X",
																github: "GitHub",
																linkedin: "LinkedIn",
															}[platform]
														}
													</option>
												),
											)}
										</NativeSelect>
									</Field>
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
										<Field key={key}>
											<FieldLabel htmlFor={`toolkit-${key}`}>
												{label}
											</FieldLabel>
											{inputType === "textarea" ? (
												<Textarea
													id={`toolkit-${key}`}
													maxLength={1600}
													value={fields[key] || ""}
													onChange={(event) => update(key, event.target.value)}
												/>
											) : (
												<Input
													id={`toolkit-${key}`}
													type={inputType || "text"}
													maxLength={1600}
													autoComplete="off"
													value={fields[key] || ""}
													onChange={(event) => update(key, event.target.value)}
												/>
											)}
										</Field>
									))}
							</FieldGroup>
							{["phone", "sms", "whatsapp", "contact"].includes(type) ? (
								<p className="text-xs text-muted-foreground">
									Include the country code, for example +1 212 555 0123.
								</p>
							) : null}
							{type === "wifi" ? (
								<p className="text-xs text-muted-foreground">
									The QR contains the network password. Share it with people who
									should have access.
								</p>
							) : null}
							{type === "event" ? (
								<p className="text-xs text-muted-foreground">
									Enter both times in UTC. Calendar apps convert the event to
									the viewer’s local time.
								</p>
							) : null}
							{type === "campaign" ? (
								<CampaignTools
									fields={fields}
									onChange={setFields}
									payload={payload}
								/>
							) : null}
							{error ? (
								<p role="status" className="text-sm text-muted-foreground">
									{error}
								</p>
							) : null}
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Design & print card</CardTitle>
							<CardDescription>
								Make it recognizable and easy to scan.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="design-preset">Design preset</FieldLabel>
									<NativeSelect
										id="design-preset"
										value=""
										onChange={(event) => {
											const preset = designPresets.find(
												(item) => item.id === event.target.value,
											);
											if (preset)
												setDesign((current) => ({
													...current,
													foreground: preset.foreground,
													background: preset.background,
													dots: preset.dots,
												}));
										}}
									>
										<option value="">Choose a look…</option>
										{designPresets.map((preset) => (
											<option key={preset.id} value={preset.id}>
												{preset.name}
											</option>
										))}
									</NativeSelect>
								</Field>
								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel htmlFor="qr-foreground">
											QR foreground
										</FieldLabel>
										<Input
											id="qr-foreground"
											type="color"
											value={design.foreground}
											onChange={(event) =>
												setDesign({ ...design, foreground: event.target.value })
											}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="qr-background">
											QR background
										</FieldLabel>
										<Input
											id="qr-background"
											type="color"
											value={design.background}
											onChange={(event) =>
												setDesign({ ...design, background: event.target.value })
											}
										/>
									</Field>
								</div>
								<p role="status" className="text-xs text-muted-foreground">
									Contrast: {contrast.ratio.toFixed(2)}:1 ·{" "}
									{contrast.safe
										? "Ready for scan testing"
										: "Use darker ink on a lighter background, with at least 4.5:1 contrast."}
								</p>
								<Field>
									<FieldLabel htmlFor="qr-resolution">
										Export resolution
									</FieldLabel>
									<NativeSelect
										id="qr-resolution"
										value={design.size}
										onChange={(event) =>
											setDesign({
												...design,
												size: Number(
													event.target.value,
												) as ToolkitDesign["size"],
											})
										}
									>
										<option value={600}>600 × 600 px · Everyday</option>
										<option value={1200}>1200 × 1200 px · Print</option>
										<option value={2400}>2400 × 2400 px · Large format</option>
									</NativeSelect>
								</Field>
								<Field>
									<FieldLabel htmlFor="qr-filename">
										Export filename (optional)
									</FieldLabel>
									<Input
										id="qr-filename"
										maxLength={80}
										value={design.filename}
										placeholder="Uses the card heading"
										onChange={(event) =>
											setDesign({ ...design, filename: event.target.value })
										}
									/>
								</Field>
							</FieldGroup>
							<Separator />
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="card-title">Card heading</FieldLabel>
									<Input
										id="card-title"
										maxLength={80}
										value={title}
										onChange={(event) => setTitle(event.target.value)}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="card-caption">Card caption</FieldLabel>
									<Textarea
										id="card-caption"
										maxLength={240}
										value={caption}
										onChange={(event) => setCaption(event.target.value)}
									/>
									<FieldDescription>
										The heading and caption appear on the printed card. Image
										downloads contain the QR only.
									</FieldDescription>
								</Field>
							</FieldGroup>
						</CardContent>
					</Card>
					<ToolkitDrafts
						storageKey={`qr-toolkit-drafts:v1:${scope}`}
						draft={{ type, fields, title, caption, design }}
						onLoad={(draft) => {
							setType(draft.type);
							setFields(draft.fields);
							setTitle(draft.title);
							setCaption(draft.caption);
							setDesign(draft.design);
						}}
					/>
				</div>
				<QrToolkitPreview
					data={payload}
					title={title}
					caption={caption}
					design={design}
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				Toolkit codes embed content directly and stay fixed after printing. They
				don’t track scans. Test your exported code with the devices your
				audience uses.
			</p>
		</div>
	);
}
