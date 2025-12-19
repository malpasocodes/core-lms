"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";

const allowedRoles = ["admin", "instructor", "learner"] as const;

export async function createUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/auth/login");

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const password = (formData.get("password") as string | null)?.trim();
  const role = (formData.get("role") as string | null)?.trim();

  if (!email || !password || !role) {
    redirect("/admin/roster?error=Missing%20fields");
  }
  if (password.length < 8) {
    redirect("/admin/roster?error=Password%20must%20be%20at%20least%208%20characters");
  }
  if (!allowedRoles.includes(role as any)) {
    redirect("/admin/roster?error=Invalid%20role");
  }

  const db = await getDb();
  await db.insert(users).values({
    id: crypto.randomUUID(),
    email,
    passwordHash: hashSync(password, 12),
    role: role as any,
  });

  redirect("/admin/roster?notice=User%20added");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/auth/login");

  const userId = (formData.get("userId") as string | null)?.trim();
  if (!userId) {
    redirect("/admin/roster?error=Missing%20user");
  }

  // Prevent deleting self to avoid locking out admin access
  if (userId === admin.id) {
    redirect("/admin/roster?error=Cannot%20delete%20your%20own%20account");
  }

  const db = await getDb();
  await db.delete(users).where(eq(users.id, userId));

  redirect("/admin/roster?notice=User%20deleted");
}
