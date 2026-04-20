import { neon } from "@neondatabase/serverless";

const ALREADY_APPLIED = [
  "0001_bored_grandmaster.sql",
  "0009_phase9_grades.sql",
  "0010_phase7_completions.sql",
  "0011_add_content_payload.sql",
  "0012_add_sections.sql",
  "0013_add_pdf_content_type.sql",
  "0014_add_markdown_content_type.sql",
  "0015_add_mcq.sql",
  "0016_add_mcq_model.sql",
  "0017_add_activity_types.sql",
  "0018_add_due_at.sql",
  "0019_add_announcements.sql",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = neon(url);

  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    name text PRIMARY KEY,
    applied_at timestamptz DEFAULT now() NOT NULL
  )`;

  for (const file of ALREADY_APPLIED) {
    await sql`INSERT INTO _migrations (name) VALUES (${file}) ON CONFLICT DO NOTHING`;
    console.log("marked", file);
  }
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
