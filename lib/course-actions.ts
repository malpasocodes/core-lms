"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, users } from "@/lib/schema";

async function upsertInstructorFromClerk(instructorId: string): Promise<boolean> {
  const client = await clerkClient();
  let clerkUser;
  try {
    clerkUser = await client.users.getUser(instructorId);
  } catch {
    return false;
  }
  const metadata = clerkUser.publicMetadata as Record<string, unknown>;
  if (metadata.role !== "instructor") return false;

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
  const db = await getDb();
  await db
    .insert(users)
    .values({ id: instructorId, email, role: "instructor", passwordHash: "" })
    .onConflictDoUpdate({ target: users.id, set: { email, role: "instructor" } });
  return true;
}

export async function createCourseAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || "";
  const instructorId = (formData.get("instructorId") as string | null)?.trim();
  const published = formData.get("published") === "on" ? "true" : "false";

  if (!title || !instructorId) {
    redirect("/courses?error=Title%20and%20instructor%20are%20required");
  }

  const valid = await upsertInstructorFromClerk(instructorId);
  if (!valid) {
    redirect("/courses?error=Instructor%20not%20found");
  }

  const db = await getDb();
  const id = crypto.randomUUID();

  await db.insert(courses).values({
    id,
    title,
    description,
    published,
    instructorId,
  });

  redirect("/courses");
}

export async function deleteCourseAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");
  const courseId = (formData.get("courseId") as string | null)?.trim();
  if (!courseId) {
    redirect("/dashboard?error=Missing%20course");
  }

  const db = await getDb();
  await db.delete(courses).where(eq(courses.id, courseId));
  redirect("/dashboard?notice=Course%20deleted");
}

export async function updateCourseAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/sign-in");

  const courseId = (formData.get("courseId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || "";
  const instructorId = (formData.get("instructorId") as string | null)?.trim();
  const published = formData.get("published") === "on" ? "true" : "false";

  if (!courseId || !title || !instructorId) {
    redirect("/courses?error=Missing%20fields");
  }

  const valid = await upsertInstructorFromClerk(instructorId);
  if (!valid) {
    redirect("/courses?error=Instructor%20not%20found");
  }

  const db = await getDb();
  await db
    .update(courses)
    .set({
      title,
      description,
      instructorId,
      published,
    })
    .where(eq(courses.id, courseId));

  redirect("/courses?notice=Course%20updated");
}
