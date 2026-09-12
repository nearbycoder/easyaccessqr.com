import { count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { member, subscription } from "@/db/schema";
import {
	getHistoryFloorDate,
	getPlanDisplayName,
	getPlanLimits,
	maxHistoryDays,
	normalizeLimit,
	normalizePlanName,
	type PlanLimits,
	type PlanName,
} from "./plan-config";

export {
	getHistoryFloorDate,
	getPlanDisplayName,
	getPlanLimits,
	maxHistoryDays,
	normalizeLimit,
	normalizePlanName,
	type PlanLimits,
	type PlanName,
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
	"active",
	"trialing",
	"past_due",
	"unpaid",
]);

type SubscriptionRow = typeof subscription.$inferSelect;

type EffectiveSubscription = {
	subscription: SubscriptionRow | null;
	scope: "organization" | "user" | "none";
	plan: PlanName;
	status: string;
	referenceId: string | null;
};

function pickBestSubscription(rows: SubscriptionRow[]): SubscriptionRow | null {
	if (rows.length === 0) return null;
	const sorted = [...rows].sort(
		(a, b) => (b.periodEnd?.getTime() ?? 0) - (a.periodEnd?.getTime() ?? 0),
	);
	return (
		sorted.find((row) => ACTIVE_SUBSCRIPTION_STATUSES.has(row.status ?? "")) ??
		sorted[0] ??
		null
	);
}

export async function resolveEffectiveSubscription({
	organizationId,
	userId,
	userIds,
}: {
	organizationId: string;
	userId?: string | null;
	userIds?: string[];
}): Promise<EffectiveSubscription> {
	const resolvedUserIds = [
		...(userId ? [userId] : []),
		...(userIds ?? []),
	].filter((value, index, allValues) => allValues.indexOf(value) === index);

	const [orgSubs, userSubs] = await Promise.all([
		db.query.subscription.findMany({
			where: eq(subscription.referenceId, organizationId),
			orderBy: [desc(subscription.periodEnd)],
		}),
		resolvedUserIds.length > 0
			? db.query.subscription.findMany({
					where: inArray(subscription.referenceId, resolvedUserIds),
					orderBy: [desc(subscription.periodEnd)],
				})
			: Promise.resolve([]),
	]);

	const orgSub = pickBestSubscription(orgSubs);
	const userSub = pickBestSubscription(userSubs);
	const selectedSub = orgSub ?? userSub;

	if (!selectedSub) {
		return {
			subscription: null,
			scope: "none",
			plan: "free",
			status: "active",
			referenceId: null,
		};
	}

	return {
		subscription: selectedSub,
		scope: orgSub ? "organization" : "user",
		plan: normalizePlanName(selectedSub.plan),
		status: selectedSub.status ?? "active",
		referenceId: selectedSub.referenceId,
	};
}

export async function resolveOrganizationPlanLimits({
	organizationId,
	userId,
	userIds,
	executor = db,
}: {
	organizationId: string;
	userId?: string | null;
	userIds?: string[];
	executor?: Pick<typeof db, "query">;
}) {
	const _unusedUserId = userId;
	const _unusedUserIds = userIds;
	void _unusedUserId;
	void _unusedUserIds;

	const orgSubs = await executor.query.subscription.findMany({
		where: eq(subscription.referenceId, organizationId),
		orderBy: [desc(subscription.periodEnd)],
	});
	const orgSub = pickBestSubscription(orgSubs);

	if (!orgSub) {
		return {
			subscription: null,
			scope: "none" as const,
			plan: "free" as const,
			status: "active",
			referenceId: null,
			limits: getPlanLimits("free"),
		};
	}

	return {
		subscription: orgSub,
		scope: "organization" as const,
		plan: normalizePlanName(orgSub.plan),
		status: orgSub.status ?? "active",
		referenceId: orgSub.referenceId,
		limits: getPlanLimits(orgSub.plan),
	};
}

export async function listOrganizationBillingUserIds(
	organizationId: string,
): Promise<string[]> {
	const orgMembers = await db.query.member.findMany({
		where: eq(member.organizationId, organizationId),
		columns: {
			userId: true,
			role: true,
		},
	});

	const privileged = orgMembers.filter((orgMember) =>
		orgMember.role
			.split(",")
			.map((part) => part.trim().toLowerCase())
			.some((role) => role === "owner" || role === "admin"),
	);

	const prioritized = privileged.length > 0 ? privileged : orgMembers;
	return prioritized.map((orgMember) => orgMember.userId);
}

export async function countOrganizationMembers(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ count: count() })
		.from(member)
		.where(eq(member.organizationId, organizationId));
	return rows[0]?.count ?? 0;
}
