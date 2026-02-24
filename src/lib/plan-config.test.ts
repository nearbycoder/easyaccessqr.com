import { describe, expect, it } from "vitest";
import {
	getHistoryFloorDate,
	getPlanDisplayName,
	getPlanLimits,
	maxHistoryDays,
	normalizeLimit,
	normalizePlanName,
} from "./plan-config";

describe("plan-config", () => {
	it("returns expected limits for each plan", () => {
		expect(getPlanLimits("free")).toEqual({
			members: 5,
			historyDays: 7,
			activeQrCodes: 3,
		});
		expect(getPlanLimits("pro")).toEqual({
			members: 15,
			historyDays: 90,
			activeQrCodes: 100,
		});
		expect(getPlanLimits("business")).toEqual({
			members: -1,
			historyDays: -1,
			activeQrCodes: -1,
		});
	});

	it("normalizes unknown plans to free", () => {
		expect(normalizePlanName("free")).toBe("free");
		expect(normalizePlanName("pro")).toBe("pro");
		expect(normalizePlanName("business")).toBe("business");
		expect(normalizePlanName("starter")).toBe("free");
		expect(normalizePlanName(null)).toBe("free");
		expect(normalizePlanName(undefined)).toBe("free");
	});

	it("maps internal plans to marketing labels", () => {
		expect(getPlanDisplayName("free")).toBe("Starter");
		expect(getPlanDisplayName("pro")).toBe("Growth");
		expect(getPlanDisplayName("business")).toBe("Scale");
		expect(getPlanDisplayName("unknown")).toBe("Starter");
	});

	it("normalizes unlimited limits", () => {
		expect(normalizeLimit(-1)).toBe(Number.MAX_SAFE_INTEGER);
		expect(normalizeLimit(3)).toBe(3);
	});

	it("clamps analytics history based on plan", () => {
		expect(maxHistoryDays(7, 30)).toBe(7);
		expect(maxHistoryDays(90, 30)).toBe(30);
		expect(maxHistoryDays(-1, 365)).toBe(365);
		expect(maxHistoryDays(7, 0)).toBe(1);
	});

	it("computes floor date for bounded history", () => {
		const now = new Date("2026-02-24T12:00:00.000Z");
		expect(getHistoryFloorDate(7, now)).toBe("2026-02-18");
		expect(getHistoryFloorDate(1, now)).toBe("2026-02-24");
		expect(getHistoryFloorDate(-1, now)).toBeNull();
	});
});
