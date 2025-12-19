import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

import * as schema from "@/lib/schema";

const connectionString = process.env.DATABASE_URL;
const neonClient = connectionString ? neon(connectionString) : null;
const drizzleDb = neonClient ? drizzle(neonClient, { schema }) : null;

export type DatabaseConnectionStatus = {
  ready: boolean;
  message: string;
};

export async function getDb() {
  if (!drizzleDb) {
    throw new Error("Database client not initialized; check DATABASE_URL");
  }
  return drizzleDb;
}

export async function checkDatabaseConnection(): Promise<DatabaseConnectionStatus> {
  if (!drizzleDb) {
    return {
      ready: false,
      message: "DATABASE_URL is not configured in this environment",
    };
  }

  try {
    const result = await drizzleDb.execute(sql`SELECT 1 AS ready`);
    const rows = Array.isArray((result as any)?.rows) ? (result as any).rows : [];
    const ready = rows?.[0]?.ready === 1;
    return {
      ready,
      message: ready
        ? "Neon Postgres responded with `SELECT 1`"
        : "Database responded but returned unexpected rows",
    };
  } catch (error) {
    return {
      ready: false,
      message:
        error instanceof Error ? error.message : "Unable to reach the database",
    };
  }
}

export { sql };
