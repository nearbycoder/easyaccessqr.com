import { Download, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
	createLocalId,
	parseDraft,
	sanitizeDraft,
	serializeDraft,
	type ToolkitDraft,
	toolkitDraftsSchema,
} from "@/lib/qr-workspace";
import { useBrowserStorage } from "@/lib/use-browser-storage";

const emptyDrafts: ToolkitDraft[] = [];
export function ToolkitDrafts({
	storageKey,
	draft,
	onLoad,
}: {
	storageKey: string;
	draft: Omit<ToolkitDraft, "id" | "name">;
	onLoad: (draft: ToolkitDraft) => void;
}) {
	const [drafts, saveDrafts] = useBrowserStorage(
		storageKey,
		toolkitDraftsSchema,
		emptyDrafts,
	);
	const [name, setName] = useState("");
	const [selected, setSelected] = useState("");
	const fileInput = useRef<HTMLInputElement>(null);
	const reportWrite = (ok: boolean) =>
		ok
			? toast.success("Draft saved in this browser")
			: toast.error(
					"Browser storage is unavailable. Export your draft instead.",
				);
	return (
		<details className="rounded-xl border bg-card p-4">
			<summary className="cursor-pointer text-sm font-semibold">
				Saved drafts & portable files
			</summary>
			<FieldGroup className="mt-4">
				<Field>
					<FieldLabel htmlFor="draft-name">Draft name</FieldLabel>
					<Input
						id="draft-name"
						maxLength={80}
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Fall campaign"
					/>
				</Field>
				<div className="flex flex-wrap gap-2">
					<Button
						size="sm"
						disabled={!name.trim() || drafts.length >= 30}
						onClick={() => {
							const item = sanitizeDraft({
								...draft,
								id: createLocalId(),
								name: name.trim(),
							});
							const ok = saveDrafts((current) => [...current, item]);
							if (ok) {
								setSelected(item.id);
								setName("");
							}
							reportWrite(ok);
						}}
					>
						<Save data-icon="inline-start" />
						Save draft
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => {
							const item = {
								...draft,
								id: createLocalId(),
								name: name.trim() || draft.title.trim() || "QR draft",
							};
							const url = URL.createObjectURL(
								new Blob([serializeDraft(item)], { type: "application/json" }),
							);
							const anchor = document.createElement("a");
							anchor.href = url;
							anchor.download = "qr-draft.json";
							document.body.append(anchor);
							anchor.click();
							anchor.remove();
							URL.revokeObjectURL(url);
						}}
					>
						<Download data-icon="inline-start" />
						Export draft
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => fileInput.current?.click()}
					>
						<Upload data-icon="inline-start" />
						Import draft
					</Button>
					<input
						ref={fileInput}
						type="file"
						accept=".json,application/json"
						aria-label="Import QR draft file"
						className="sr-only"
						onChange={async (event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (!file) return;
							try {
								if (file.size > 60_000)
									throw new Error("Draft files must be smaller than 60 KB.");
								const item = parseDraft(await file.text());
								onLoad(item);
								setName(item.name);
								setSelected("");
								toast.success("Draft imported. Save it to keep a local copy.");
							} catch (cause) {
								toast.error((cause as Error).message);
							}
						}}
					/>
				</div>
				{drafts.length ? (
					<Field>
						<FieldLabel htmlFor="saved-draft">Saved draft</FieldLabel>
						<NativeSelect
							id="saved-draft"
							value={
								drafts.some((item) => item.id === selected) ? selected : ""
							}
							onChange={(event) => {
								const item = drafts.find(
									(item) => item.id === event.target.value,
								);
								setSelected(event.target.value);
								if (item) {
									onLoad(item);
									toast.success(`Loaded ${item.name}`);
								}
							}}
						>
							<option value="">Choose a draft…</option>
							{drafts.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name}
								</option>
							))}
						</NativeSelect>
						<Button
							size="sm"
							variant="ghost"
							disabled={!selected}
							onClick={() => {
								const ok = saveDrafts((current) =>
									current.filter((item) => item.id !== selected),
								);
								if (ok) setSelected("");
								else reportWrite(false);
							}}
						>
							<Trash2 data-icon="inline-start" />
							Delete selected draft
						</Button>
					</Field>
				) : null}
				<p className="text-xs text-muted-foreground">
					{drafts.length}/30 drafts in this browser and workspace. Wi-Fi
					passwords are omitted from saved and exported drafts.
				</p>
			</FieldGroup>
		</details>
	);
}
