CREATE TABLE "announcements" (
  "id" text PRIMARY KEY NOT NULL,
  "course_id" text NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "author_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
