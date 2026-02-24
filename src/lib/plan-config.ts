export type PlanName = "free" | "pro" | "business";

export type PlanLimits = {
	members: number;
	historyDays: number;
	activeQrCodes: number;
};

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
	free: {
		members: 5,
		historyDays: 7,
		activeQrCodes: 3,
	},
	pro: {
		members: 15,
		historyDays: 90,
		activeQrCodes: 100,
	},
	business: {
		members: -1,
		historyDays: -1,
		activeQrCodes: -1,
	},
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
	const normalizedPlan = normalizePlanName(plan);
	return PLAN_LIMITS[normalizedPlan];
}

export function normalizeLimit(limit: number): number {
	return limit < 0 ? Number.MAX_SAFE_INTEGER : limit;
}

export function normalizePlanName(plan: string | null | undefined): PlanName {
	if (plan === "business") return "business";
	if (plan === "pro") return "pro";
	return "free";
}

export function getPlanDisplayName(plan: string | null | undefined): string {
	const normalized = normalizePlanName(plan);
	if (normalized === "pro") return "Growth";
	if (normalized === "business") return "Scale";
	return "Starter";
}

export function getHistoryFloorDate(
	historyDays: number,
	now = new Date(),
): string | null {
	if (historyDays < 0) return null;
	const floor = new Date(now);
	floor.setHours(0, 0, 0, 0);
	floor.setDate(floor.getDate() - (historyDays - 1));
	return floor.toISOString().split("T")[0];
}

export function maxHistoryDays(
	historyDays: number,
	requestedDays: number,
): number {
	if (historyDays < 0) return requestedDays;
	return Math.max(1, Math.min(historyDays, requestedDays));
}
