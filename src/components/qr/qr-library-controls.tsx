import type { LibraryFilters } from "@/lib/qr-library";
export function QrLibraryFilters({
	value,
	onChange,
}: {
	value: LibraryFilters;
	onChange: (value: LibraryFilters) => void;
}) {
	return (
		<div className="mt-3 grid gap-3 sm:grid-cols-3">
			<label className="toolkit-label">
				Public page
				<select
					className="toolkit-input"
					value={value.visibility}
					onChange={(e) => onChange({ ...value, visibility: e.target.value })}
				>
					<option value="all">All visibility</option>
					<option value="public">Public page enabled</option>
					<option value="private">Public page disabled</option>
				</select>
			</label>
			<label className="toolkit-label">
				Routing
				<select
					className="toolkit-input"
					value={value.routing}
					onChange={(e) => onChange({ ...value, routing: e.target.value })}
				>
					<option value="all">All routing</option>
					<option value="single">Single destination</option>
					<option value="weighted">Weighted destinations</option>
				</select>
			</label>
			<label className="toolkit-label">
				Scan activity
				<select
					className="toolkit-input"
					value={value.activity}
					onChange={(e) => onChange({ ...value, activity: e.target.value })}
				>
					<option value="all">All scan activity</option>
					<option value="never">Never scanned</option>
					<option value="scanned">Has scans</option>
				</select>
			</label>
		</div>
	);
}
