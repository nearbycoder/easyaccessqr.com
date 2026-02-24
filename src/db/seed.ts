import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
	account,
	invitation,
	member,
	organization,
	qrCode,
	qrScanEvent,
	subscription,
	user,
} from "@/db/schema";
import type { QrDestinationRule } from "@/lib/qr-destinations";

type InsertedQrCode = {
	id: number;
	slug: string;
	destinations: QrDestinationRule[];
};

type SeedScanEventDraft = {
	scannedAt: Date;
	referrer: string | null;
	userAgent: string | null;
	ipHash: string | null;
	selectedDestinationId: string | null;
	selectedDestinationUrl: string | null;
	country: string | null;
	city: string | null;
	deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
};

const seedOwnerUserId = "seed-user-owner";
const seedMemberUserId = "seed-user-member";
const seedOrganizationId = "seed-org-main";

const seedOwnerEmail = "owner@easyaccessqr.com";
const seedMemberEmail = "analyst@easyaccessqr.com";
const seedPassword = process.env.SEED_PASSWORD ?? "EasyAccessQR!123";

function quoteIdentifier(identifier: string) {
	return `"${identifier.replaceAll('"', '""')}"`;
}

function daysAgo(days: number, hour = 12) {
	const value = new Date();
	value.setHours(hour, 0, 0, 0);
	value.setDate(value.getDate() - days);
	return value;
}

function getDestinationById(
	destinations: QrDestinationRule[],
	id: string,
): QrDestinationRule {
	const found = destinations.find((destination) => destination.id === id);
	if (!found) {
		throw new Error(`[seed] Missing destination ${id}`);
	}
	return found;
}

function createSpringLaunchEvents(
	destinations: QrDestinationRule[],
): SeedScanEventDraft[] {
	const primary = getDestinationById(destinations, "dest-1");
	const variant = getDestinationById(destinations, "dest-2");
	const counts = [4, 3, 4, 5, 3, 4, 6, 5, 4, 7, 6, 8, 7, 5];
	const events: SeedScanEventDraft[] = [];

	for (const [dayOffset, total] of counts.entries()) {
		for (let index = 0; index < total; index += 1) {
			const useVariant = index % 4 === 0;
			const selected = useVariant ? variant : primary;
			events.push({
				scannedAt: daysAgo(dayOffset, 10 + (index % 8)),
				referrer: useVariant
					? "https://www.linkedin.com/"
					: "https://www.google.com/",
				userAgent:
					index % 2 === 0
						? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)"
						: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7)",
				ipHash: `seed-spring-${dayOffset}-${index}`,
				selectedDestinationId: selected.id,
				selectedDestinationUrl: selected.url,
				country: index % 3 === 0 ? "United States" : "Canada",
				city: index % 3 === 0 ? "San Francisco" : "Toronto",
				deviceType: index % 2 === 0 ? "mobile" : "desktop",
			});
		}
	}

	return events;
}

function createDocsEvents(
	destinations: QrDestinationRule[],
): SeedScanEventDraft[] {
	const primary = getDestinationById(destinations, "dest-1");
	const counts = [1, 0, 2, 1, 3, 2, 2, 1, 0, 2];
	const events: SeedScanEventDraft[] = [];

	for (const [dayOffset, total] of counts.entries()) {
		for (let index = 0; index < total; index += 1) {
			events.push({
				scannedAt: daysAgo(dayOffset + 2, 9 + (index % 8)),
				referrer: "https://easyaccessqr.com/",
				userAgent:
					"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
				ipHash: `seed-docs-${dayOffset}-${index}`,
				selectedDestinationId: primary.id,
				selectedDestinationUrl: primary.url,
				country: "United States",
				city: index % 2 === 0 ? "Austin" : "Denver",
				deviceType: "mobile",
			});
		}
	}

	return events;
}

async function resetDatabase() {
	const tablesResult = await db.$client.query<{ tablename: string }>(
		`
			SELECT tablename
			FROM pg_tables
			WHERE schemaname = 'public'
				AND tablename NOT IN ('__drizzle_migrations', 'drizzle_migrations')
			ORDER BY tablename
		`,
	);
	const tableNames = tablesResult.rows.map((row) => row.tablename);
	if (tableNames.length === 0) {
		console.log("[seed] No public tables found to reset.");
		return;
	}

	const quotedTableNames = tableNames.map(quoteIdentifier).join(", ");
	await db.$client.query(
		`TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE`,
	);
	console.log(`[seed] Reset ${tableNames.length} tables.`);
}

async function main() {
	console.log("[seed] Easy Access QR seed started");
	await resetDatabase();

	const now = new Date();
	const passwordHash = await hashPassword(seedPassword);

	await db.insert(user).values([
		{
			id: seedOwnerUserId,
			name: "Easy Access Owner",
			email: seedOwnerEmail,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: seedMemberUserId,
			name: "Analytics Member",
			email: seedMemberEmail,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		},
	]);

	await db.insert(account).values([
		{
			id: "seed-account-owner",
			accountId: seedOwnerUserId,
			providerId: "credential",
			userId: seedOwnerUserId,
			password: passwordHash,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "seed-account-member",
			accountId: seedMemberUserId,
			providerId: "credential",
			userId: seedMemberUserId,
			password: passwordHash,
			createdAt: now,
			updatedAt: now,
		},
	]);

	await db.insert(organization).values({
		id: seedOrganizationId,
		name: "Nearby Labs",
		slug: "nearby-labs",
		createdAt: now,
	});

	await db.insert(member).values([
		{
			id: "seed-member-owner",
			organizationId: seedOrganizationId,
			userId: seedOwnerUserId,
			role: "owner",
			createdAt: now,
		},
		{
			id: "seed-member-analyst",
			organizationId: seedOrganizationId,
			userId: seedMemberUserId,
			role: "member",
			createdAt: now,
		},
	]);

	await db.insert(subscription).values({
		id: "seed-subscription-free",
		plan: "free",
		referenceId: seedOrganizationId,
		status: "active",
		periodStart: now,
		periodEnd: daysAgo(-30),
		seats: 3,
	});

	await db.insert(invitation).values({
		id: "seed-invite-1",
		organizationId: seedOrganizationId,
		email: "futuremember@easyaccessqr.com",
		role: "member",
		status: "pending",
		expiresAt: daysAgo(-7),
		inviterId: seedOwnerUserId,
		createdAt: now,
	});

	const createdCodes = await db
		.insert(qrCode)
		.values([
			{
				organizationId: seedOrganizationId,
				createdByUserId: seedOwnerUserId,
				name: "Spring launch landing",
				slug: "spring-launch",
				destinationUrl: "https://easyaccessqr.com/launch",
				destinations: [
					{
						id: "dest-1",
						label: "Primary",
						url: "https://easyaccessqr.com/launch",
						weight: 70,
					},
					{
						id: "dest-2",
						label: "Variant B",
						url: "https://easyaccessqr.com/launch?variant=b",
						weight: 30,
					},
				],
				isActive: true,
				isPublic: true,
				tags: ["campaign", "ab-test"],
			},
			{
				organizationId: seedOrganizationId,
				createdByUserId: seedOwnerUserId,
				name: "Support docs",
				slug: "support-docs",
				destinationUrl: "https://easyaccessqr.com/docs",
				destinations: [
					{
						id: "dest-1",
						label: "Primary",
						url: "https://easyaccessqr.com/docs",
						weight: 100,
					},
				],
				isActive: true,
				isPublic: false,
				tags: ["support"],
			},
			{
				organizationId: seedOrganizationId,
				createdByUserId: seedOwnerUserId,
				name: "Paused event poster",
				slug: "event-poster",
				destinationUrl: "https://easyaccessqr.com/events",
				destinations: [
					{
						id: "dest-1",
						label: "Primary",
						url: "https://easyaccessqr.com/events",
						weight: 100,
					},
				],
				isActive: false,
				isPublic: false,
				tags: ["events", "paused"],
			},
		])
		.returning({
			id: qrCode.id,
			slug: qrCode.slug,
			destinations: qrCode.destinations,
		});

	const springLaunchCode = createdCodes.find(
		(row) => row.slug === "spring-launch",
	);
	const docsCode = createdCodes.find((row) => row.slug === "support-docs");

	if (!springLaunchCode || !docsCode) {
		throw new Error("[seed] Expected QR codes were not created.");
	}

	const eventsByQrCodeId = new Map<number, SeedScanEventDraft[]>();
	eventsByQrCodeId.set(
		springLaunchCode.id,
		createSpringLaunchEvents(springLaunchCode.destinations),
	);
	eventsByQrCodeId.set(docsCode.id, createDocsEvents(docsCode.destinations));

	const scanRows = Array.from(eventsByQrCodeId.entries()).flatMap(
		([qrCodeId, events]) =>
			events.map((event) => ({
				qrCodeId,
				organizationId: seedOrganizationId,
				scannedAt: event.scannedAt,
				referrer: event.referrer,
				userAgent: event.userAgent,
				ipHash: event.ipHash,
				selectedDestinationId: event.selectedDestinationId,
				selectedDestinationUrl: event.selectedDestinationUrl,
				country: event.country,
				city: event.city,
				deviceType: event.deviceType,
			})),
	);

	if (scanRows.length > 0) {
		await db.insert(qrScanEvent).values(scanRows);
	}

	for (const code of createdCodes satisfies InsertedQrCode[]) {
		const codeEvents = eventsByQrCodeId.get(code.id) ?? [];
		const lastScannedAt =
			codeEvents.length > 0
				? new Date(
						Math.max(...codeEvents.map((event) => event.scannedAt.getTime())),
					)
				: null;

		await db
			.update(qrCode)
			.set({
				scanCount: codeEvents.length,
				lastScannedAt,
				updatedAt: now,
			})
			.where(eq(qrCode.id, code.id));
	}

	console.log(
		"[seed] Seeded demo data for users, organizations, and QR analytics.",
	);
	console.log(
		`[seed] Demo login: ${seedOwnerEmail} / ${seedPassword} (organization: Nearby Labs)`,
	);
}

main()
	.catch((error) => {
		console.error("[seed] Failed", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$client.end();
	});
