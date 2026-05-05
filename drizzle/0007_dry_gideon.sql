CREATE TABLE "course_reference_books" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"openstax_book_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_reference_books" ADD CONSTRAINT "course_reference_books_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reference_books" ADD CONSTRAINT "course_reference_books_openstax_book_id_openstax_books_id_fk" FOREIGN KEY ("openstax_book_id") REFERENCES "public"."openstax_books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_reference_books_course_book_unique" ON "course_reference_books" USING btree ("course_id","openstax_book_id");