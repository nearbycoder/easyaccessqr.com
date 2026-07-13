const CSV_FORMULA_PREFIX = /^[=+\-@]/;

export function formatCsvCell(value: unknown): string {
	const raw = value == null ? "" : String(value);
	const safe = CSV_FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
	return `"${safe.replaceAll('"', '""')}"`;
}

export function formatCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
	return rows.map((row) => row.map(formatCsvCell).join(",")).join("\r\n");
}

export function downloadCsv(
	filename: string,
	rows: ReadonlyArray<ReadonlyArray<unknown>>,
) {
	if (typeof document === "undefined") return;
	const csv = `\uFEFF${formatCsv(rows)}`;
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
	anchor.style.display = "none";
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export async function copyText(value: string): Promise<void> {
	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(value);
			return;
		} catch {
			// Fall back for blocked clipboard permissions and non-secure contexts.
		}
	}

	const textarea = document.createElement("textarea");
	textarea.value = value;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.append(textarea);
	textarea.select();
	const copied = document.execCommand("copy");
	textarea.remove();
	if (!copied) throw new Error("Clipboard access is unavailable.");
}
