import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { useBrowserStorage } from "./use-browser-storage";

const schema = z.array(z.string());
const fallback: string[] = [];
beforeEach(() => {
	const values = new Map<string, string>();
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		clear: () => values.clear(),
	});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});
it("loads workspace preferences and switches scope without overwriting either workspace", async () => {
	localStorage.setItem("a", JSON.stringify(["first"]));
	localStorage.setItem("b", JSON.stringify(["second"]));
	const { result, rerender } = renderHook(
		({ scope }) => useBrowserStorage(scope, schema, fallback),
		{ initialProps: { scope: "a" } },
	);
	await waitFor(() => expect(result.current[0]).toEqual(["first"]));
	act(() => {
		expect(result.current[1]((current) => [...current, "updated"])).toBe(true);
	});
	rerender({ scope: "b" });
	await waitFor(() => expect(result.current[0]).toEqual(["second"]));
	expect(JSON.parse(localStorage.getItem("a") || "")).toEqual([
		"first",
		"updated",
	]);
	expect(JSON.parse(localStorage.getItem("b") || "")).toEqual(["second"]);
});
it("ignores invalid stored values and keeps state intact when storage is blocked", async () => {
	localStorage.setItem("a", "corrupt-json");
	const { result } = renderHook(() => useBrowserStorage("a", schema, fallback));
	await waitFor(() => expect(result.current[0]).toEqual([]));
	const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
		throw new Error("blocked");
	});
	act(() => {
		expect(result.current[1](["lost"])).toBe(false);
	});
	expect(result.current[0]).toEqual([]);
	write.mockRestore();
});
