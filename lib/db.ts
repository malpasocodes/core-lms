import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

import * as schema from "@/lib/schema";

const connectionString = process.env.DATABASE_URL;

const client = connectionString ? new Client({ connectionString }) : null;
let connectionPromise: Promise<void> | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export type DatabaseConnectionStatus = {
  ready: boolean;
  message: string;
};

async function connectClient() {
  if (!client) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!connectionPromise) {
    connectionPromise = client.connect();
  }

  await connectionPromise;
  return client;
}

export async function getDb() {
  if (drizzleDb) return drizzleDb;
  const connectedClient = await connectClient();
  drizzleDb = drizzle(connectedClient, { schema });
  return drizzleDb;
}

export async function checkDatabaseConnection(): Promise<DatabaseConnectionStatus> {
  if (!connectionString) {
    return {
      ready: false,
      message: "DATABASE_URL is not configured in this environment",
    };
  }

  try {
    const db = await getDb();
    const result = await db.execute(sql`SELECT 1 AS ready`);
    const rows = Array.isArray(result?.rows) ? result.rows : [];
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
