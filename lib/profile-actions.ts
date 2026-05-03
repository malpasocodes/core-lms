"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { ensureUserInDb } from "@/lib/user-sync";
import { getDb } from "@/lib/db";
import { userProfiles } from "@/lib/schema";

const FIELD_MAX = 200;
const BIO_MAX = 1000;

function clean(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

export async function updateUserProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await ensureUserInDb();

  const preferredName = clean(formData.get("preferredName") as string | null, FIELD_MAX);
  const timezone = clean(formData.get("timezone") as string | null, FIELD_MAX);
  const location = clean(formData.get("location") as string | null, FIELD_MAX);
  const linkedin = clean(formData.get("linkedin") as string | null, FIELD_MAX);
  const bio = clean(formData.get("bio") as string | null, BIO_MAX);

  const db = await getDb();
  const now = new Date();

  const existing = await db.query.userProfiles.findFirst({
    columns: { userId: true },
    where: (p, { eq }) => eq(p.userId, user.id),
  });

  if (existing) {
    await db
      .update(userProfiles)
      .set({ preferredName, timezone, location, linkedin, bio, updatedAt: now })
      .where(eq(userProfiles.userId, user.id));
  } else {
    await db.insert(userProfiles).values({
      userId: user.id,
      preferredName,
      timezone,
      location,
      linkedin,
      bio,
      updatedAt: now,
    });
  }

  redirect("/dashboard?notice=Profile%20updated");
}
