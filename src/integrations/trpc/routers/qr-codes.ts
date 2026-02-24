import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, inArray, lte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { qrCode, qrScanEvent } from "@/db/schema";
import {
	getPlanDisplayName,
	maxHistoryDays,
	resolveOrganizationPlanLimits,
} from "@/lib/plan-limits";
import {
	MAX_QR_DESTINATIONS,
	normalizeQrDestinations,
} from "@/lib/qr-destinations";
import { orgProcedure } from "../init";

const analyticsRangeDaysSchema = z.union([
	z.literal(7),
	z.literal(14),
	z.literal(30),
	z.literal(60),
	z.literal(90),
]);

function isSupportedHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value.trim());
		if (parsed.username || parsed.password) return false;
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

const httpUrlSchema = z
	.string()
	.trim()
	.min(1)
	.max(2048)
	.refine((value) => isSupportedHttpUrl(value), {
		message: "URL must be a valid HTTP or HTTPS URL.",
	});

const qrDestinationSchema = z.object({
	id: z.string().trim().min(1).max(64).optional(),
	label: z.string().trim().max(80).optional(),
	url: httpUrlSchema,
	weight: z.number().int().min(1).max(100),
});

const qrCreateSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		destinationUrl: httpUrlSchema.optional(),
		destinations: z
			.array(qrDestinationSchema)
			.min(1)
			.max(MAX_QR_DESTINATIONS)
			.optional(),
		slug: z
			.string()
			.trim()
			.min(2)
			.max(80)
			.regex(/^[a-z0-9-]+$/)
			.optional(),
		tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
		isPublic: z.boolean().optional(),
	})
	.superRefine((value, ctx) => {
		const hasDestinationUrl = Boolean(value.destinationUrl?.trim());
		const hasDestinations = (value.destinations?.length ?? 0) > 0;
		if (!hasDestinationUrl && !hasDestinations) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["destinationUrl"],
				message: "At least one destination URL is required.",
			});
		}
	});

const qrUpdateSchema = z.object({
	id: z.number().int().positive(),
	name: z.string().trim().min(1).max(80).optional(),
	destinationUrl: httpUrlSchema.optional(),
	destinations: z
		.array(qrDestinationSchema)
		.min(1)
		.max(MAX_QR_DESTINATIONS)
		.optional(),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(80)
		.regex(/^[a-z0-9-]+$/)
		.optional(),
	isActive: z.boolean().optional(),
	isPublic: z.boolean().optional(),
	tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
});

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 80);
}

function toIsoDate(value: Date): string {
	return value.toISOString().split("T")[0];
}

function toLocalDateKey(value: Date): string {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function toDestinationUrlKey(value: string | null | undefined) {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed.toLowerCase();
}

async function countActiveQrCodesByOrganization(
	organizationId: string,
): Promise<number> {
	const rows = await db
		.select({ count: count() })
		.from(qrCode)
		.where(
			and(eq(qrCode.organizationId, organizationId), eq(qrCode.isActive, true)),
		);
	return rows[0]?.count ?? 0;
}

async function assertCanUseAdditionalActiveQrCode({
	organizationId,
	userId,
}: {
	organizationId: string;
	userId: string;
}) {
	const plan = await resolveOrganizationPlanLimits({
		organizationId,
		userId,
	});
	const limit = plan.limits.activeQrCodes;
	if (limit < 0) return;

	const activeCount = await countActiveQrCodesByOrganization(organizationId);
	if (activeCount >= limit) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: `${getPlanDisplayName(plan.plan)} allows up to ${limit} active QR codes. Pause an active code or upgrade to activate more.`,
		});
	}
}

function isMissingDestinationColumnsError(error: unknown) {
	if (!error || typeof error !== "object") return false;
	const maybeError = error as { message?: string; code?: string };
	if (maybeError.code === "42703") return true;
	const message = (maybeError.message ?? "").toLowerCase();
	return (
		message.includes("selected_destination_id") ||
		message.includes("selected_destination_url")
	);
}

function resolveDestinationPayload(input: {
	destinationUrl?: string;
	destinations?: Array<{
		id?: string;
		label?: string;
		url: string;
		weight: number;
	}>;
	fallbackDestinationUrl?: string | null;
	fallbackDestinations?: unknown;
}) {
	const rawDestinations =
		input.destinations !== undefined
			? input.destinations
			: input.destinationUrl
				? [
						{
							id: "dest-1",
							label: "Primary",
							url: input.destinationUrl,
							weight: 100,
						},
					]
				: (input.fallbackDestinations ?? []);
	const normalized = normalizeQrDestinations(
		rawDestinations,
		input.destinationUrl ?? input.fallbackDestinationUrl,
	);

	if (normalized.length === 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "At least one valid destination URL is required.",
		});
	}

	return {
		destinationUrl: normalized[0]?.url ?? "",
		destinations: normalized,
	};
}

async function resolveUniqueSlug(
	organizationId: string,
	rawSlug: string,
	excludeId?: number,
): Promise<string> {
	const base =
		slugify(rawSlug) || `qr-${Math.random().toString(36).slice(2, 8)}`;
	let candidate = base;
	let suffix = 2;

	while (true) {
		const existing = await db.query.qrCode.findFirst({
			where: and(
				eq(qrCode.organizationId, organizationId),
				eq(qrCode.slug, candidate),
			),
			columns: { id: true },
		});

		if (!existing || existing.id === excludeId) {
			return candidate;
		}

		candidate = `${base}-${suffix}`;
		suffix += 1;
	}
}

export const qrCodesRouter = {
	list: orgProcedure
		.input(
			z
				.object({
					includeInactive: z.boolean().default(true),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [eq(qrCode.organizationId, ctx.organizationId)];
			if (!input?.includeInactive) {
				conditions.push(eq(qrCode.isActive, true));
			}

			const rows = await db.query.qrCode.findMany({
				where: and(...conditions),
				orderBy: [desc(qrCode.createdAt)],
				with: {
					createdByUser: {
						columns: { id: true, name: true, image: true },
					},
				},
			});

			return rows.map((row) => {
				const destinations = normalizeQrDestinations(
					row.destinations,
					row.destinationUrl,
				);
				return {
					...row,
					destinations,
					destinationUrl: destinations[0]?.url ?? row.destinationUrl,
				};
			});
		}),

	create: orgProcedure
		.input(qrCreateSchema)
		.mutation(async ({ ctx, input }) => {
			await assertCanUseAdditionalActiveQrCode({
				organizationId: ctx.organizationId,
				userId: ctx.session.user.id,
			});
			const slug = await resolveUniqueSlug(
				ctx.organizationId,
				input.slug ?? input.name,
			);
			const destinationPayload = resolveDestinationPayload({
				destinationUrl: input.destinationUrl,
				destinations: input.destinations,
			});

			const inserted = await db
				.insert(qrCode)
				.values({
					organizationId: ctx.organizationId,
					createdByUserId: ctx.session.user.id,
					name: input.name.trim(),
					destinationUrl: destinationPayload.destinationUrl,
					destinations: destinationPayload.destinations,
					slug,
					isPublic: input.isPublic ?? false,
					tags: (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
				})
				.returning({ id: qrCode.id });

			return {
				id: inserted[0]?.id ?? null,
				slug,
			};
		}),

	update: orgProcedure
		.input(qrUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			const current = await db.query.qrCode.findFirst({
				where: and(
					eq(qrCode.id, input.id),
					eq(qrCode.organizationId, ctx.organizationId),
				),
				columns: {
					id: true,
					slug: true,
					isActive: true,
					destinationUrl: true,
					destinations: true,
				},
			});

			if (!current) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "QR code not found.",
				});
			}

			const nextSlug =
				input.slug !== undefined
					? await resolveUniqueSlug(ctx.organizationId, input.slug, current.id)
					: current.slug;
			const shouldUpdateDestinations =
				input.destinationUrl !== undefined || input.destinations !== undefined;
			const destinationPayload = shouldUpdateDestinations
				? resolveDestinationPayload({
						destinationUrl: input.destinationUrl,
						destinations: input.destinations,
						fallbackDestinationUrl: current.destinationUrl,
						fallbackDestinations: current.destinations,
					})
				: null;
			if (input.isActive === true && !current.isActive) {
				await assertCanUseAdditionalActiveQrCode({
					organizationId: ctx.organizationId,
					userId: ctx.session.user.id,
				});
			}

			await db
				.update(qrCode)
				.set({
					...(input.name !== undefined ? { name: input.name.trim() } : {}),
					...(destinationPayload
						? {
								destinationUrl: destinationPayload.destinationUrl,
								destinations: destinationPayload.destinations,
							}
						: {}),
					...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
					...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
					...(input.tags !== undefined
						? {
								tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
							}
						: {}),
					slug: nextSlug,
					updatedAt: new Date(),
				})
				.where(eq(qrCode.id, current.id));

			return { id: current.id, slug: nextSlug };
		}),

	delete: orgProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const deleted = await db
				.delete(qrCode)
				.where(
					and(
						eq(qrCode.id, input.id),
						eq(qrCode.organizationId, ctx.organizationId),
					),
				)
				.returning({ id: qrCode.id });

			if (deleted.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "QR code not found.",
				});
			}

			return { id: deleted[0]?.id ?? input.id };
		}),

	recordScan: orgProcedure
		.input(
			z.object({
				qrCodeId: z.number().int().positive(),
				referrer: z.string().max(2048).optional(),
				userAgent: z.string().max(2048).optional(),
				ipHash: z.string().max(128).optional(),
				selectedDestinationId: z.string().trim().max(64).optional(),
				selectedDestinationUrl: httpUrlSchema.optional(),
				country: z.string().max(80).optional(),
				city: z.string().max(80).optional(),
				deviceType: z
					.enum(["desktop", "mobile", "tablet", "bot", "unknown"])
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const target = await db.query.qrCode.findFirst({
				where: and(
					eq(qrCode.id, input.qrCodeId),
					eq(qrCode.organizationId, ctx.organizationId),
				),
				columns: { id: true, isActive: true },
			});

			if (!target) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "QR code not found.",
				});
			}

			if (!target.isActive) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "Cannot record scans for an inactive QR code.",
				});
			}

			const now = new Date();
			let inserted: Array<{ id: number }>;
			try {
				inserted = await db
					.insert(qrScanEvent)
					.values({
						qrCodeId: target.id,
						organizationId: ctx.organizationId,
						scannedAt: now,
						referrer: input.referrer,
						userAgent: input.userAgent,
						ipHash: input.ipHash,
						selectedDestinationId: input.selectedDestinationId,
						selectedDestinationUrl: input.selectedDestinationUrl,
						country: input.country,
						city: input.city,
						deviceType: input.deviceType ?? "unknown",
					})
					.returning({ id: qrScanEvent.id });
			} catch (error) {
				if (!isMissingDestinationColumnsError(error)) {
					throw error;
				}
				inserted = await db
					.insert(qrScanEvent)
					.values({
						qrCodeId: target.id,
						organizationId: ctx.organizationId,
						scannedAt: now,
						referrer: input.referrer,
						userAgent: input.userAgent,
						ipHash: input.ipHash,
						country: input.country,
						city: input.city,
						deviceType: input.deviceType ?? "unknown",
					})
					.returning({ id: qrScanEvent.id });
			}

			await db
				.update(qrCode)
				.set({
					scanCount: sql`${qrCode.scanCount} + 1`,
					lastScannedAt: now,
					updatedAt: now,
				})
				.where(eq(qrCode.id, target.id));

			return {
				eventId: inserted[0]?.id ?? null,
				qrCodeId: target.id,
				scannedAt: now,
			};
		}),

	getAnalytics: orgProcedure
		.input(
			z.object({
				rangeDays: analyticsRangeDaysSchema.default(30),
				qrCodeId: z.number().int().positive().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const plan = await resolveOrganizationPlanLimits({
				organizationId: ctx.organizationId,
				userId: ctx.session.user.id,
			});
			const effectiveRangeDays = maxHistoryDays(
				plan.limits.historyDays,
				input.rangeDays,
			);
			const endDate = new Date();
			endDate.setHours(23, 59, 59, 999);
			const startDate = new Date(endDate);
			startDate.setHours(0, 0, 0, 0);
			startDate.setDate(startDate.getDate() - effectiveRangeDays + 1);

			const codeConditions = [eq(qrCode.organizationId, ctx.organizationId)];
			if (input.qrCodeId) {
				codeConditions.push(eq(qrCode.id, input.qrCodeId));
			}

			const codes = await db.query.qrCode.findMany({
				where: and(...codeConditions),
				columns: {
					id: true,
					name: true,
					slug: true,
					isActive: true,
					scanCount: true,
					lastScannedAt: true,
					destinationUrl: true,
					destinations: true,
				},
			});
			const normalizedCodes = codes.map((code) => {
				const destinations = normalizeQrDestinations(
					code.destinations,
					code.destinationUrl,
				);
				return {
					...code,
					destinations,
					destinationUrl: destinations[0]?.url ?? code.destinationUrl,
				};
			});

			if (normalizedCodes.length === 0) {
				return {
					period: {
						startDate: toIsoDate(startDate),
						endDate: toIsoDate(endDate),
					},
					range: {
						requestedDays: input.rangeDays,
						appliedDays: effectiveRangeDays,
					},
					totals: {
						qrCodes: 0,
						activeQrCodes: 0,
						totalScans: 0,
						scansToday: 0,
					},
					dailyScans: [],
					topCodes: [],
				};
			}

			const codeIds = normalizedCodes.map((code) => code.id);
			const queryWhere = and(
				eq(qrScanEvent.organizationId, ctx.organizationId),
				gte(qrScanEvent.scannedAt, startDate),
				lte(qrScanEvent.scannedAt, endDate),
				inArray(qrScanEvent.qrCodeId, codeIds),
			);

			let events: Array<{
				id: number;
				qrCodeId: number;
				scannedAt: Date;
				selectedDestinationId: string | null;
				selectedDestinationUrl: string | null;
			}>;
			try {
				events = await db.query.qrScanEvent.findMany({
					where: queryWhere,
					columns: {
						id: true,
						qrCodeId: true,
						scannedAt: true,
						selectedDestinationId: true,
						selectedDestinationUrl: true,
					},
					orderBy: [desc(qrScanEvent.scannedAt)],
				});
			} catch (error) {
				if (!isMissingDestinationColumnsError(error)) {
					throw error;
				}
				const legacyEvents = await db.query.qrScanEvent.findMany({
					where: queryWhere,
					columns: {
						id: true,
						qrCodeId: true,
						scannedAt: true,
					},
					orderBy: [desc(qrScanEvent.scannedAt)],
				});
				events = legacyEvents.map((event) => ({
					...event,
					selectedDestinationId: null,
					selectedDestinationUrl: null,
				}));
			}

			const todayKey = toLocalDateKey(new Date());
			const byDate = new Map<
				string,
				{ scans: number; qrCodeIds: Set<number> }
			>();
			const scansByCode = new Map<number, number>();
			const destinationHitsByCode = new Map<
				number,
				Map<
					string,
					{
						destinationId: string | null;
						destinationUrl: string | null;
						viewsInRange: number;
					}
				>
			>();
			let scansToday = 0;

			for (const event of events) {
				const dateKey = toLocalDateKey(event.scannedAt);
				if (!byDate.has(dateKey)) {
					byDate.set(dateKey, { scans: 0, qrCodeIds: new Set<number>() });
				}
				const bucket = byDate.get(dateKey);
				if (!bucket) continue;
				bucket.scans += 1;
				bucket.qrCodeIds.add(event.qrCodeId);

				scansByCode.set(
					event.qrCodeId,
					(scansByCode.get(event.qrCodeId) ?? 0) + 1,
				);
				if (dateKey === todayKey) scansToday += 1;

				const destinationId = event.selectedDestinationId?.trim() || null;
				const destinationUrl = event.selectedDestinationUrl?.trim() || null;
				const destinationUrlKey = toDestinationUrlKey(destinationUrl);
				const destinationKey = destinationId
					? `id:${destinationId}`
					: destinationUrlKey
						? `url:${destinationUrlKey}`
						: "unattributed";

				if (!destinationHitsByCode.has(event.qrCodeId)) {
					destinationHitsByCode.set(event.qrCodeId, new Map());
				}
				const codeDestinationHits = destinationHitsByCode.get(event.qrCodeId);
				if (!codeDestinationHits) continue;
				const currentDestinationHit = codeDestinationHits.get(destinationKey);
				if (currentDestinationHit) {
					currentDestinationHit.viewsInRange += 1;
					continue;
				}

				codeDestinationHits.set(destinationKey, {
					destinationId,
					destinationUrl,
					viewsInRange: 1,
				});
			}

			const dailyScans: Array<{
				date: string;
				scans: number;
				uniqueQrCodes: number;
			}> = [];
			for (let offset = 0; offset < effectiveRangeDays; offset += 1) {
				const current = new Date(startDate);
				current.setDate(startDate.getDate() + offset);
				const dateKey = toLocalDateKey(current);
				const bucket = byDate.get(dateKey);
				dailyScans.push({
					date: dateKey,
					scans: bucket?.scans ?? 0,
					uniqueQrCodes: bucket?.qrCodeIds.size ?? 0,
				});
			}

			const topCodes = [...normalizedCodes]
				.map((code) => {
					const destinationHits = code.destinations.map(
						(destination, index) => ({
							id: destination.id,
							label: destination.label?.trim() || `Destination ${index + 1}`,
							url: destination.url,
							weight: destination.weight,
							viewsInRange: 0,
							isConfigured: true,
						}),
					);
					const destinationIndexById = new Map(
						destinationHits.map((destination, index) => [
							destination.id,
							index,
						]),
					);
					const destinationIndexByUrl = new Map(
						destinationHits
							.map((destination, index) => [
								toDestinationUrlKey(destination.url),
								index,
							])
							.filter((entry): entry is [string, number] => entry[0] !== null),
					);

					let unattributedViewsInRange = 0;
					const extraDestinationHits: Array<{
						id: string;
						label: string;
						url: string;
						weight: number;
						viewsInRange: number;
						isConfigured: boolean;
					}> = [];
					const codeDestinationHits = destinationHitsByCode.get(code.id);
					if (codeDestinationHits) {
						for (const destinationHit of codeDestinationHits.values()) {
							if (
								!destinationHit.destinationId &&
								!destinationHit.destinationUrl
							) {
								unattributedViewsInRange += destinationHit.viewsInRange;
								continue;
							}

							const matchById = destinationHit.destinationId
								? destinationIndexById.get(destinationHit.destinationId)
								: undefined;
							const destinationUrlKey = toDestinationUrlKey(
								destinationHit.destinationUrl,
							);
							const matchByUrl = destinationUrlKey
								? destinationIndexByUrl.get(destinationUrlKey)
								: undefined;
							const targetIndex = matchById ?? matchByUrl;
							if (targetIndex !== undefined) {
								const target = destinationHits[targetIndex];
								if (target) {
									target.viewsInRange += destinationHit.viewsInRange;
								}
								continue;
							}

							extraDestinationHits.push({
								id:
									destinationHit.destinationId ??
									`historic-${extraDestinationHits.length + 1}`,
								label: "Previous destination",
								url: destinationHit.destinationUrl ?? "Unknown URL",
								weight: 0,
								viewsInRange: destinationHit.viewsInRange,
								isConfigured: false,
							});
						}
					}

					return {
						id: code.id,
						name: code.name,
						slug: code.slug,
						destinationUrl: code.destinationUrl,
						destinationCount: code.destinations.length,
						isActive: code.isActive,
						scanCount: code.scanCount,
						lastScannedAt: code.lastScannedAt,
						scansInRange: scansByCode.get(code.id) ?? 0,
						unattributedViewsInRange,
						destinationHits: [...destinationHits, ...extraDestinationHits].sort(
							(a, b) =>
								b.viewsInRange - a.viewsInRange ||
								b.weight - a.weight ||
								a.label.localeCompare(b.label),
						),
					};
				})
				.sort(
					(a, b) =>
						b.scansInRange - a.scansInRange ||
						b.scanCount - a.scanCount ||
						a.name.localeCompare(b.name),
				)
				.slice(0, 12);

			return {
				period: {
					startDate: toIsoDate(startDate),
					endDate: toIsoDate(endDate),
				},
				range: {
					requestedDays: input.rangeDays,
					appliedDays: effectiveRangeDays,
				},
				totals: {
					qrCodes: normalizedCodes.length,
					activeQrCodes: normalizedCodes.filter((code) => code.isActive).length,
					totalScans: events.length,
					scansToday,
				},
				dailyScans,
				topCodes,
			};
		}),

	listCreatedByUser: orgProcedure
		.input(
			z.object({
				userId: z.string().min(1),
				limit: z.number().int().min(1).max(100).default(25),
				cursorCreatedAt: z.string().datetime().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [
				eq(qrCode.organizationId, ctx.organizationId),
				eq(qrCode.createdByUserId, input.userId),
			];
			if (input.cursorCreatedAt) {
				conditions.push(lt(qrCode.createdAt, new Date(input.cursorCreatedAt)));
			}

			const rows = await db.query.qrCode.findMany({
				where: and(...conditions),
				limit: input.limit + 1,
				orderBy: [desc(qrCode.createdAt), desc(qrCode.id)],
			});

			const hasMore = rows.length > input.limit;
			const items = hasMore ? rows.slice(0, input.limit) : rows;
			const normalizedItems = items.map((item) => {
				const destinations = normalizeQrDestinations(
					item.destinations,
					item.destinationUrl,
				);
				return {
					...item,
					destinations,
					destinationUrl: destinations[0]?.url ?? item.destinationUrl,
				};
			});
			const nextCursorCreatedAt = hasMore
				? (items[items.length - 1]?.createdAt.toISOString() ?? null)
				: null;

			return {
				items: normalizedItems,
				hasMore,
				nextCursorCreatedAt,
			};
		}),
};
