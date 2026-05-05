CREATE TYPE "public"."assessment_visibility" AS ENUM('visible', 'invisible');--> statement-breakpoint
CREATE TYPE "public"."assessment_weighting" AS ENUM('formative', 'summative');--> statement-breakpoint
ALTER TYPE "public"."assessment_type" ADD VALUE 'notes';--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "visibility" "assessment_visibility" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "weighting" "assessment_weighting" DEFAULT 'summative' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "ai_score" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "ai_analysis" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "ai_model" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "ai_status" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "ai_analyzed_at" timestamp with time zone;--> statement-breakpoint
INSERT INTO "assessments" (id, activity_id, type, title, description, graded, visibility, weighting, "order", created_at)
SELECT
  gen_random_uuid()::text,
  activity_id,
  'notes',
  'Watch notes',
  NULL,
  true,
  'invisible',
  'formative',
  0,
  NOW()
FROM (SELECT DISTINCT activity_id FROM "activity_notes") AS d;--> statement-breakpoint
INSERT INTO "submissions" (id, assessment_id, user_id, submission_text, ai_score, ai_analysis, ai_model, ai_status, ai_analyzed_at, submitted_at)
SELECT
  gen_random_uuid()::text,
  a.id,
  n.user_id,
  n.notes,
  n.ai_score,
  n.ai_analysis,
  n.ai_model,
  n.ai_status,
  n.ai_analyzed_at,
  n.updated_at
FROM "activity_notes" n
JOIN "assessments" a ON a.activity_id = n.activity_id AND a.type = 'notes';--> statement-breakpoint
DROP TABLE "activity_notes" CASCADE;
