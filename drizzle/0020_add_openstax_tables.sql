CREATE TABLE IF NOT EXISTS "openstax_books" (
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
CREATE TABLE IF NOT EXISTS "openstax_chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "openstax_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"chapter_id" text NOT NULL,
	"title" text NOT NULL,
	"content_html" text,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "openstax_chapters" ADD CONSTRAINT "openstax_chapters_book_id_openstax_books_id_fk"
    FOREIGN KEY ("book_id") REFERENCES "openstax_books"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "openstax_sections" ADD CONSTRAINT "openstax_sections_chapter_id_openstax_chapters_id_fk"
    FOREIGN KEY ("chapter_id") REFERENCES "openstax_chapters"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
