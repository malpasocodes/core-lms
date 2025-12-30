CREATE TABLE IF NOT EXISTS "completions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "content_item_id" text NOT NULL REFERENCES "content_items"("id") ON DELETE CASCADE,
  "completed_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "completions_user_item_unique" ON "completions" ("user_id", "content_item_id");
