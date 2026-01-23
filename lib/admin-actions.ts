"use server";

import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";

import { requireAdmin, type Role } from "@/lib/auth";

const allowedRoles = ["admin", "instructor", "learner"] as const;

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = (formData.get("password") as string | null)?.trim();
  const role = (formData.get("role") as string | null)?.trim();

  if (!email || !password || !role) {
    redirect("/admin/roster?error=Missing%20fields");
  }
  if (password.length < 8) {
    redirect("/admin/roster?error=Password%20must%20be%20at%20least%208%20characters");
  }
  if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    redirect("/admin/roster?error=Invalid%20role");
  }

  try {
    const client = await clerkClient();
    await client.users.createUser({
      emailAddress: [email],
      password,
      publicMetadata: { role, approved: true },
    });
  } catch (error: unknown) {
    const clerkError = error as { errors?: Array<{ message?: string }> };
    const message = clerkError?.errors?.[0]?.message || "Failed to create user";
    redirect(`/admin/roster?error=${encodeURIComponent(message)}`);
  }

  redirect("/admin/roster?notice=User%20added");
}

export async function approveUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const userId = (formData.get("userId") as string | null)?.trim();
  const role = (formData.get("role") as string | null)?.trim();

  if (!userId || !role) {
    redirect("/admin/roster?view=approve&error=Missing%20fields");
  }
  if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    redirect("/admin/roster?view=approve&error=Invalid%20role");
  }

  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role, approved: true },
    });
  } catch {
    redirect("/admin/roster?view=approve&error=Failed%20to%20approve%20user");
  }

  redirect("/admin/roster?view=approve&notice=User%20approved");
}

export async function rejectUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const userId = (formData.get("userId") as string | null)?.trim();
  if (!userId) {
    redirect("/admin/roster?view=approve&error=Missing%20user");
  }

  if (userId === admin.id) {
    redirect("/admin/roster?view=approve&error=Cannot%20reject%20your%20own%20account");
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch {
    redirect("/admin/roster?view=approve&error=Failed%20to%20reject%20user");
  }

  redirect("/admin/roster?view=approve&notice=User%20rejected");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const userId = (formData.get("userId") as string | null)?.trim();
  if (!userId) {
    redirect("/admin/roster?error=Missing%20user");
  }

  if (userId === admin.id) {
    redirect("/admin/roster?error=Cannot%20delete%20your%20own%20account");
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch {
    redirect("/admin/roster?error=Failed%20to%20delete%20user");
  }

  redirect("/admin/roster?notice=User%20deleted");
}

export async function updateUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const userId = (formData.get("userId") as string | null)?.trim();
  const role = (formData.get("role") as string | null)?.trim();

  if (!userId || !role) {
    redirect("/admin/roster?error=Missing%20fields");
  }
  if (!allowedRoles.includes(role as (typeof allowedRoles)[number])) {
    redirect("/admin/roster?error=Invalid%20role");
  }

  try {
    const client = await clerkClient();
    // Get existing metadata to preserve approved flag
    const user = await client.users.getUser(userId);
    const existingMetadata = user.publicMetadata as Record<string, unknown>;
    await client.users.updateUser(userId, {
      publicMetadata: { ...existingMetadata, role: role as Role },
    });
  } catch {
    redirect("/admin/roster?error=Failed%20to%20update%20role");
  }

  redirect("/admin/roster?notice=Role%20updated");
}
