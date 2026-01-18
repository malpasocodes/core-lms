"use server";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { roleEnum } from "@/lib/schema";

export type Role = (typeof roleEnum.enumValues)[number];

type ClerkUser = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Get the current user from Clerk and extract role from publicMetadata.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<ClerkUser | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const role = (user.publicMetadata?.role as Role) ?? "learner";

  return {
    id: user.id,
    email,
    role,
  };
}

/**
 * Require authenticated user, redirect to sign-in if not.
 */
export async function requireUser(): Promise<ClerkUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

/**
 * Require user with specific role(s), redirect to dashboard if unauthorized.
 */
export async function requireRole(role: Role | Role[]): Promise<ClerkUser> {
  const user = await requireUser();
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAdmin(): Promise<ClerkUser> {
  return requireRole("admin");
}

export async function requireInstructor(): Promise<ClerkUser> {
  return requireRole("instructor");
}

export async function requireLearner(): Promise<ClerkUser> {
  return requireRole("learner");
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for") ?? "unknown";
}
