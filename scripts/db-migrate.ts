import fs from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(url);

  // Create tracking table if it doesn't exist
  await sql(
    `CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz DEFAULT now() NOT NULL
    )`
  );

  // Fetch already-applied migrations
  const rows = await sql(`SELECT name FROM _migrations`);
  const applied = new Set(rows.map((r) => (r as { name: string }).name));

  const migrationsDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      // eslint-disable-next-line no-console
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const statements = raw
      .split(/;\s*\n/g)
      .map((stmt) => stmt.trim())
      .filter(Boolean);

    // eslint-disable-next-line no-console
    console.log(`Applying ${file}...`);
    for (const stmt of statements) {
      await sql(stmt);
    }

    await sql(`INSERT INTO _migrations (name) VALUES ('${file}')`);
  }

  // eslint-disable-next-line no-console
  console.log("Migrations complete");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
