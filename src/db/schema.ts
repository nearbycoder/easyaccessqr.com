import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type { QrDestinationRule } from "@/lib/qr-destinations";

export * from "./auth-schema";

import { organization, user } from "./auth-schema";

export const qrCode = pgTable(
	"qr_code",
	{
		id: serial("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		createdByUserId: text("created_by_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		destinationUrl: text("destination_url").notNull(),
		destinations: jsonb("destinations")
			.$type<QrDestinationRule[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		isActive: boolean("is_active").default(true).notNull(),
		isPublic: boolean("is_public").default(false).notNull(),
		tags: text("tags").array().default([]).notNull(),
		scanCount: integer("scan_count").default(0).notNull(),
		lastScannedAt: timestamp("last_scanned_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("qr_code_org_slug_uidx").on(table.organizationId, table.slug),
		index("qr_code_org_idx").on(table.organizationId),
		index("qr_code_creator_idx").on(table.createdByUserId),
		index("qr_code_active_idx").on(table.isActive),
		index("qr_code_public_idx").on(table.isPublic),
	],
);

export const qrCodeRelations = relations(qrCode, ({ one, many }) => ({
	organization: one(organization, {
		fields: [qrCode.organizationId],
		references: [organization.id],
	}),
	createdByUser: one(user, {
		fields: [qrCode.createdByUserId],
		references: [user.id],
	}),
	scanEvents: many(qrScanEvent),
}));

export const qrScanEvent = pgTable(
	"qr_scan_event",
	{
		id: serial("id").primaryKey(),
		qrCodeId: integer("qr_code_id")
			.notNull()
			.references(() => qrCode.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		scannedAt: timestamp("scanned_at").defaultNow().notNull(),
		referrer: text("referrer"),
		userAgent: text("user_agent"),
		ipHash: text("ip_hash"),
		selectedDestinationId: text("selected_destination_id"),
		selectedDestinationUrl: text("selected_destination_url"),
		country: text("country"),
		city: text("city"),
		deviceType: text("device_type", {
			enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
		})
			.default("unknown")
			.notNull(),
	},
	(table) => [
		index("qr_scan_event_qr_idx").on(table.qrCodeId),
		index("qr_scan_event_org_idx").on(table.organizationId),
		index("qr_scan_event_scanned_at_idx").on(table.scannedAt),
		index("qr_scan_event_qr_scanned_at_idx").on(
			table.qrCodeId,
			table.scannedAt,
		),
	],
);

export const qrScanEventRelations = relations(qrScanEvent, ({ one }) => ({
	qrCode: one(qrCode, {
		fields: [qrScanEvent.qrCodeId],
		references: [qrCode.id],
	}),
	organization: one(organization, {
		fields: [qrScanEvent.organizationId],
		references: [organization.id],
	}),
}));
