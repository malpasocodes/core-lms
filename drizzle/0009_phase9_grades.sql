CREATE TABLE IF NOT EXISTS "grades" (
  "id" text PRIMARY KEY NOT NULL,
  "submission_id" text NOT NULL REFERENCES "submissions"("id") ON DELETE CASCADE,
  "score" integer NOT NULL CHECK ("score" >= 0 AND "score" <= 100),
  "graded_by" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "graded_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "grades_submission_unique" ON "grades" ("submission_id");
