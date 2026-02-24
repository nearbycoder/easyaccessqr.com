import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { member, qrCode, user } from "@/db/schema";
import { orgProcedure } from "../init";

function normalizeBioInput(bio: string | null | undefined) {
	const trimmed = bio?.trim() ?? "";
	return trimmed.length > 0 ? trimmed : null;
}

export const profileRouter = {
	getUserProfile: orgProcedure
		.input(
			z.object({
				userId: z.string().min(1),
				limit: z.number().int().min(1).max(100).default(25),
				cursorCreatedAt: z.string().datetime().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [viewerMembership, targetMembership, targetUser] =
				await Promise.all([
					db.query.member.findFirst({
						where: and(
							eq(member.organizationId, ctx.organizationId),
							eq(member.userId, ctx.session.user.id),
						),
						columns: { id: true },
					}),
					db.query.member.findFirst({
						where: and(
							eq(member.organizationId, ctx.organizationId),
							eq(member.userId, input.userId),
						),
						columns: { role: true, createdAt: true },
					}),
					db.query.user.findFirst({
						where: eq(user.id, input.userId),
						columns: {
							id: true,
							name: true,
							image: true,
							bio: true,
							createdAt: true,
						},
					}),
				]);

			if (!viewerMembership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a member of this organization.",
				});
			}
			if (!targetMembership || !targetUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found in this organization.",
				});
			}

			const codeRows = await db.query.qrCode.findMany({
				where: and(
					eq(qrCode.organizationId, ctx.organizationId),
					eq(qrCode.createdByUserId, input.userId),
					...(input.cursorCreatedAt
						? [lt(qrCode.createdAt, new Date(input.cursorCreatedAt))]
						: []),
				),
				columns: {
					id: true,
					name: true,
					slug: true,
					destinationUrl: true,
					isActive: true,
					scanCount: true,
					lastScannedAt: true,
					createdAt: true,
				},
				orderBy: [desc(qrCode.createdAt), desc(qrCode.id)],
				limit: input.limit + 1,
			});

			const hasMore = codeRows.length > input.limit;
			const items = hasMore ? codeRows.slice(0, input.limit) : codeRows;
			const nextCursorCreatedAt = hasMore
				? (items[items.length - 1]?.createdAt.toISOString() ?? null)
				: null;

			return {
				user: targetUser,
				organizationMembership: {
					role: targetMembership.role,
					joinedAt: targetMembership.createdAt,
				},
				qrCodes: {
					items,
					nextCursorCreatedAt,
					hasMore,
				},
			};
		}),

	updateMyBio: orgProcedure
		.input(
			z.object({
				bio: z.string().max(500).nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const currentMembership = await db.query.member.findFirst({
				where: and(
					eq(member.organizationId, ctx.organizationId),
					eq(member.userId, ctx.session.user.id),
				),
				columns: { id: true },
			});

			if (!currentMembership) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a member of this organization.",
				});
			}

			const bio = normalizeBioInput(input.bio);
			await db
				.update(user)
				.set({
					bio,
					updatedAt: new Date(),
				})
				.where(eq(user.id, ctx.session.user.id));

			return { bio };
		}),
};
