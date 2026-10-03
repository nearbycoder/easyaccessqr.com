import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Download, WandSparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv } from "@/lib/client-export";
import { cleanTrackingUrl, type ToolkitFields } from "@/lib/qr-toolkit";
import {
	campaignPresets,
	campaignVariants,
	importCampaignUrl,
	normalizeCampaign,
} from "@/lib/qr-workspace";

export function CampaignTools({
	fields,
	onChange,
	payload,
}: {
	fields: ToolkitFields;
	onChange: (fields: ToolkitFields) => void;
	payload: string;
}) {
	const [sources, setSources] = useState("");
	const action = (operation: () => void) => {
		try {
			operation();
		} catch (cause) {
			toast.error((cause as Error).message);
		}
	};
	return (
		<div className="flex flex-col gap-4">
			<Field>
				<FieldLabel htmlFor="campaign-preset">Campaign preset</FieldLabel>
				<NativeSelect
					id="campaign-preset"
					value=""
					onChange={(event) => {
						const preset = campaignPresets.find(
							(item) => item.id === event.target.value,
						);
						if (preset)
							onChange({
								...fields,
								source: preset.source,
								medium: preset.medium,
							});
					}}
				>
					<option value="">Apply a source and medium…</option>
					{campaignPresets.map((preset) => (
						<option key={preset.id} value={preset.id}>
							{preset.name}
						</option>
					))}
				</NativeSelect>
			</Field>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						action(() => {
							onChange(importCampaignUrl(fields.url || ""));
							toast.success("Campaign parameters imported");
						})
					}
				>
					Import parameters from URL
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onChange(normalizeCampaign(fields))}
				>
					<WandSparkles data-icon="inline-start" />
					Normalize campaign values
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() =>
						action(() => {
							onChange({ ...fields, url: cleanTrackingUrl(fields.url || "") });
							toast.success("Tracking parameters removed from destination");
						})
					}
				>
					Clean tracking parameters
				</Button>
			</div>
			<details className="rounded-lg border p-3">
				<summary className="cursor-pointer text-sm font-medium">
					Generate campaign variants
				</summary>
				<FieldGroup className="mt-4">
					<Field>
						<FieldLabel htmlFor="campaign-sources">Variant sources</FieldLabel>
						<Textarea
							id="campaign-sources"
							placeholder={"store-chicago\nstore-austin\nstore-boston"}
							maxLength={8000}
							value={sources}
							onChange={(event) => setSources(event.target.value)}
						/>
						<FieldDescription>
							One source per line, up to 100. Other campaign fields stay the
							same.
						</FieldDescription>
					</Field>
					<Button
						variant="outline"
						disabled={!sources.trim()}
						onClick={() =>
							action(() => {
								const variants = campaignVariants(fields, sources);
								downloadCsv("campaign-variants", [
									["Source", "Campaign URL"],
									...variants.map((item) => [item.source, item.url]),
								]);
								toast.success(`Exported ${variants.length} campaign URLs`);
							})
						}
					>
						<Download data-icon="inline-start" />
						Export variants CSV
					</Button>
				</FieldGroup>
			</details>
			{payload ? (
				<Button asChild variant="secondary">
					<Link
						to="/app/qr-codes/new"
						search={{ destination: payload, name: fields.campaign || "" }}
					>
						Create managed campaign QR
						<ArrowUpRight data-icon="inline-end" />
					</Link>
				</Button>
			) : null}
			<p className="text-xs text-muted-foreground">
				Managed codes track scans and let you change the destination after
				printing.
			</p>
		</div>
	);
}
