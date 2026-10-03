import { Bookmark, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { SavedLibraryView } from "@/lib/qr-workspace";
import { createLocalId } from "@/lib/qr-workspace";

export function LibraryProductivity({
	hosts,
	current,
	views,
	onChange,
	onSave,
	onDelete,
}: {
	hosts: string[];
	current: Omit<SavedLibraryView, "id" | "name">;
	views: SavedLibraryView[];
	onChange: (view: Omit<SavedLibraryView, "id" | "name">) => void;
	onSave: (view: SavedLibraryView) => boolean;
	onDelete: (id: string) => boolean;
}) {
	const [name, setName] = useState("");
	const [selected, setSelected] = useState("");
	return (
		<div className="flex flex-col gap-3 border-t pt-3">
			<div className="flex flex-wrap items-end gap-3">
				<Field className="min-w-0 flex-1">
					<FieldLabel htmlFor="destination-host">Destination domain</FieldLabel>
					<NativeSelect
						id="destination-host"
						value={current.host}
						onChange={(event) => {
							setSelected("");
							onChange({ ...current, host: event.target.value });
						}}
					>
						<option value="all">All destination domains</option>
						{hosts.map((host) => (
							<option key={host} value={host}>
								{host}
							</option>
						))}
						{current.host !== "all" && !hosts.includes(current.host) ? (
							<option value={current.host}>{current.host} (no codes)</option>
						) : null}
					</NativeSelect>
				</Field>
				<Button
					variant="outline"
					aria-pressed={current.favoritesOnly}
					onClick={() => {
						setSelected("");
						onChange({ ...current, favoritesOnly: !current.favoritesOnly });
					}}
				>
					<Star data-icon="inline-start" />
					{current.favoritesOnly ? "Showing favorites" : "Favorites only"}
				</Button>
			</div>
			<details>
				<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
					Saved library views
				</summary>
				<FieldGroup className="mt-4">
					<Field>
						<FieldLabel htmlFor="library-view">Saved view</FieldLabel>
						<NativeSelect
							id="library-view"
							value={views.some((view) => view.id === selected) ? selected : ""}
							onChange={(event) => {
								setSelected(event.target.value);
								const view = views.find(
									(item) => item.id === event.target.value,
								);
								if (view) {
									onChange(view);
									toast.success(`Applied ${view.name}`);
								}
							}}
						>
							<option value="">Choose a view…</option>
							{views.map((view) => (
								<option value={view.id} key={view.id}>
									{view.name}
								</option>
							))}
						</NativeSelect>
					</Field>
					<Field>
						<FieldLabel htmlFor="library-view-name">New view name</FieldLabel>
						<Input
							id="library-view-name"
							maxLength={60}
							value={name}
							placeholder="Active store posters"
							onChange={(event) => setName(event.target.value)}
						/>
						<FieldDescription>
							Save search, filters, and sort order in this browser and
							workspace.
						</FieldDescription>
					</Field>
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={!name.trim() || views.length >= 20}
							onClick={() => {
								const view = {
									...current,
									id: createLocalId(),
									name: name.trim(),
								};
								if (onSave(view)) {
									setName("");
									setSelected(view.id);
									toast.success("View saved");
								} else toast.error("Browser storage is unavailable.");
							}}
						>
							<Bookmark data-icon="inline-start" />
							Save current view
						</Button>
						<Button
							size="sm"
							variant="ghost"
							disabled={!selected}
							onClick={() => {
								if (onDelete(selected)) {
									setSelected("");
									toast.success("View deleted");
								} else toast.error("Browser storage is unavailable.");
							}}
						>
							<Trash2 data-icon="inline-start" />
							Delete view
						</Button>
					</div>
				</FieldGroup>
			</details>
		</div>
	);
}
