ALTER TABLE "team" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_member" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "team" CASCADE;--> statement-breakpoint
DROP TABLE "team_member" CASCADE;--> statement-breakpoint
ALTER TABLE "qr_code" DROP CONSTRAINT "qr_code_team_id_team_id_fk";
--> statement-breakpoint
DROP INDEX "qr_code_team_idx";--> statement-breakpoint
ALTER TABLE "qr_code" ADD COLUMN "destinations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "qr_code" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "invitation" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "session" DROP COLUMN "active_team_id";