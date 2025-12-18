import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const connectionString = process.env.DATABASE_URL;

const client = connectionString ? new Client({ connectionString }) : null;
let connectionPromise: Promise<void> | null = null;

export const db = client ? drizzle(client) : null;

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

export async function checkDatabaseConnection(): Promise<DatabaseConnectionStatus> {
  if (!connectionString) {
    return {
      ready: false,
      message: "DATABASE_URL is not configured in this environment",
    };
  }

  try {
    const connectedClient = await connectClient();
    const { rows } = await connectedClient.query("SELECT 1 AS ready");
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
