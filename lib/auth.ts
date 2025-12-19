"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { compareSync, hashSync } from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";

import { getDb, sql } from "@/lib/db";
import { roleEnum, sessions, users, type User } from "@/lib/schema";

const SESSION_COOKIE = "corelms_session";
const SESSION_TTL_DAYS = 7;

type AuthResult =
  | { ok: true; user: Pick<User, "id" | "email" | "role"> }
  | { ok: false; message: string };

const publicRoles = ["learner", "instructor"] as const;
export type Role = (typeof roleEnum.enumValues)[number];

let ensured = false;
async function ensureAuthTables() {
  if (ensured) return;
  const db = await getDb();
  // Minimal, idempotent schema creation for demo environments without migrations.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('learner', 'instructor', 'admin');
      END IF;
    END$$;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role user_role NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS courses (
      id text PRIMARY KEY,
      title text NOT NULL,
      description text,
      instructor_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      published text NOT NULL DEFAULT 'false',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  ensured = true;
}

function createId() {
  return crypto.randomUUID();
}

function sessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

async function hashPassword(password: string) {
  return hashSync(password, 12);
}

async function verifyPassword(password: string, hash: string) {
  return compareSync(password, hash);
}

export async function registerUser(input: {
  email: string;
  password: string;
  role: Role;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const role = input.role;

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (!publicRoles.includes(role as any)) {
    return { ok: false, message: "Invalid role selection." };
  }

  await ensureAuthTables();
  const db = await getDb();

  const existing = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, email),
  });
  if (existing) {
    return { ok: false, message: "An account already exists for this email." };
  }

  const id = createId();
  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ id, email, passwordHash, role });

  const user: Pick<User, "id" | "email" | "role"> = { id, email, role };
  await createSession(user.id);

  return { ok: true, user };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !password) {
    return { ok: false, message: "Email and password are required." };
  }

  await ensureAuthTables();
  const db = await getDb();
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return { ok: false, message: "Invalid credentials." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, message: "Invalid credentials." };
  }

  await createSession(user.id);
  return { ok: true, user: { id: user.id, email: user.email, role: user.role } };
}

async function createSession(userId: string) {
  await ensureAuthTables();
  const db = await getDb();
  const id = createId();
  const expiresAt = sessionExpiry();

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function logoutUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return;
  await ensureAuthTables();
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  await ensureAuthTables();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = await getDb();
  const now = new Date();
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)),
  });

  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  const user = await db.query.users.findFirst({
    columns: { id: true, email: true, role: true },
    where: eq(users.id, session.userId),
  });

  if (!user) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function requireRole(role: Role | Role[]) {
  const user = await requireUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole("admin");
}

export async function requireInstructor() {
  return requireRole("instructor");
}

export async function requireLearner() {
  return requireRole("learner");
}

export async function getClientIp() {
  const h = await headers();
  return h.get("x-forwarded-for") ?? "unknown";
}
