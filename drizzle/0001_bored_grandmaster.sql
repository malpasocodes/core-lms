ALTER TYPE "public"."content_type" ADD VALUE 'pdf';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'markdown';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'watch';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'listen';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'read';--> statement-breakpoint
ALTER TYPE "public"."content_type" ADD VALUE 'write';--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcq_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"order" integer NOT NULL,
	"question_text" text NOT NULL,
	"options" text NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openstax_books" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text,
	"cnx_id" text NOT NULL,
	"source_url" text,
	"chapter_count" integer,
	"ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openstax_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openstax_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"chapter_id" text NOT NULL,
	"title" text NOT NULL,
	"content_html" text,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"source_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" DROP CONSTRAINT "content_items_module_id_modules_id_fk";
--> statement-breakpoint
ALTER TABLE "grades" ALTER COLUMN "graded_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "section_id" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "type" text DEFAULT 'open_ended' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "source_content_item_id" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "linked_activity_id" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "mcq_model" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "section_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "mcq_answers" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openstax_chapters" ADD CONSTRAINT "openstax_chapters_book_id_openstax_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."openstax_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openstax_sections" ADD CONSTRAINT "openstax_sections_chapter_id_openstax_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."openstax_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_source_content_item_id_content_items_id_fk" FOREIGN KEY ("source_content_item_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_linked_activity_id_content_items_id_fk" FOREIGN KEY ("linked_activity_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" DROP COLUMN "module_id";