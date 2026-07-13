import { describe, expect, it } from "vitest";
import { formatCsv, formatCsvCell } from "./client-export";

describe("CSV export formatting", () => {
	it("quotes commas, newlines, and double quotes", () => {
		expect(formatCsvCell('Launch, "Summer"\n2026')).toBe(
			'"Launch, ""Summer""\n2026"',
		);
	});

	it("neutralizes spreadsheet formulas", () => {
		expect(formatCsvCell('=HYPERLINK("https://bad.example")')).toBe(
			'"\'=HYPERLINK(""https://bad.example"")"',
		);
		expect(formatCsvCell("+SUM(1,1)")).toBe('"\'+SUM(1,1)"');
		expect(formatCsvCell("@cmd")).toBe('"\'@cmd"');
	});

	it("formats rows with CRLF separators", () => {
		expect(
			formatCsv([
				["Name", "Views"],
				["Spring", 42],
			]),
		).toBe('"Name","Views"\r\n"Spring","42"');
	});
});
