DROP TABLE IF EXISTS "grades" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "submissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "mcq_questions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "completions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "assignments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "content_items" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."content_type";--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('watch', 'listen', 'read', 'write');--> statement-breakpoint
CREATE TYPE "public"."assessment_type" AS ENUM('open_ended', 'mcq');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"section_id" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_payload" text,
	"source_ref" text,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"type" "assessment_type" DEFAULT 'open_ended' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"graded" boolean DEFAULT false NOT NULL,
	"mcq_model" text,
	"due_at" timestamp with time zone,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"submission_text" text,
	"file_url" text,
	"mcq_answers" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "completions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" text PRIMARY KEY NOT NULL,
	"submission_id" text NOT NULL,
	"score" integer NOT NULL,
	"graded_by" text,
	"graded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"assessment_id" text NOT NULL,
	"order" integer NOT NULL,
	"question_text" text NOT NULL,
	"options" text NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_assessment_user_unique" ON "submissions" USING btree ("assessment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "completions_user_activity_unique" ON "completions" USING btree ("user_id","activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_submission_unique" ON "grades" USING btree ("submission_id");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completions" ADD CONSTRAINT "completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completions" ADD CONSTRAINT "completions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;
