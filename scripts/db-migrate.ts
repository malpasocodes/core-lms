import fs from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(url);
  const migrationsDir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
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
  }

  // eslint-disable-next-line no-console
  console.log("Migrations applied");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
