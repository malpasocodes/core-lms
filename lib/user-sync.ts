"use server";

import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import type { Role } from "@/lib/auth";

/**
 * Ensure the current Clerk user exists in local DB for foreign key references.
 * Call this before any operation that needs to reference users table.
 * Returns the user ID if successful, null if not authenticated.
 */
export async function ensureUserInDb(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const db = await getDb();
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const role = (user.publicMetadata?.role as Role) ?? "learner";

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.id, user.id),
  });

  if (existing) {
    // Update email/role if changed
    await db
      .update(users)
      .set({ email, role })
      .where(eq(users.id, user.id));
    return user.id;
  }

  // Insert new user (Clerk ID as primary key)
  await db.insert(users).values({
    id: user.id,
    email,
    passwordHash: "CLERK_MANAGED",
    role,
  });

  return user.id;
}

/**
 * Sync a specific Clerk user to the local database.
 * Useful for webhook handlers or admin operations.
 */
export async function syncUserToDb(clerkUser: {
  id: string;
  email: string;
  role: Role;
}): Promise<void> {
  const db = await getDb();

  const existing = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.id, clerkUser.id),
  });

  if (existing) {
    await db
      .update(users)
      .set({ email: clerkUser.email, role: clerkUser.role })
      .where(eq(users.id, clerkUser.id));
  } else {
    await db.insert(users).values({
      id: clerkUser.id,
      email: clerkUser.email,
      passwordHash: "CLERK_MANAGED",
      role: clerkUser.role,
    });
  }
}

/**
 * Remove a user from the local database.
 * Useful for webhook handlers when a user is deleted from Clerk.
 */
export async function removeUserFromDb(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(users).where(eq(users.id, userId));
}
