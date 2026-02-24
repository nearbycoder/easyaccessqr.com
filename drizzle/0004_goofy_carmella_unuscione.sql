CREATE TABLE "qr_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"team_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"destination_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"last_scanned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_scan_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"qr_code_id" integer NOT NULL,
	"organization_id" text NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"referrer" text,
	"user_agent" text,
	"ip_hash" text,
	"country" text,
	"city" text,
	"device_type" text DEFAULT 'unknown' NOT NULL
);
--> statement-breakpoint
DROP TABLE "email_digest_preference" CASCADE;--> statement-breakpoint
DROP TABLE "standup_entry" CASCADE;--> statement-breakpoint
DROP TABLE "standup_share" CASCADE;--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_code" ADD CONSTRAINT "qr_code_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_scan_event" ADD CONSTRAINT "qr_scan_event_qr_code_id_qr_code_id_fk" FOREIGN KEY ("qr_code_id") REFERENCES "public"."qr_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_scan_event" ADD CONSTRAINT "qr_scan_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qr_code_org_slug_uidx" ON "qr_code" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "qr_code_org_idx" ON "qr_code" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "qr_code_creator_idx" ON "qr_code" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "qr_code_team_idx" ON "qr_code" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "qr_code_active_idx" ON "qr_code" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "qr_scan_event_qr_idx" ON "qr_scan_event" USING btree ("qr_code_id");--> statement-breakpoint
CREATE INDEX "qr_scan_event_org_idx" ON "qr_scan_event" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "qr_scan_event_scanned_at_idx" ON "qr_scan_event" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "qr_scan_event_qr_scanned_at_idx" ON "qr_scan_event" USING btree ("qr_code_id","scanned_at");