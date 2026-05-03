ALTER TABLE "activity_notes" ADD COLUMN "ai_score" integer;--> statement-breakpoint
ALTER TABLE "activity_notes" ADD COLUMN "ai_analysis" text;--> statement-breakpoint
ALTER TABLE "activity_notes" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "activity_notes" ADD COLUMN "ai_status" text;--> statement-breakpoint
ALTER TABLE "activity_notes" ADD COLUMN "ai_analyzed_at" timestamp with time zone;