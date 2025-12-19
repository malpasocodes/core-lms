"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, users } from "@/lib/schema";

export async function createCourseAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/auth/login");

  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || "";
  const instructorId = (formData.get("instructorId") as string | null)?.trim();
  const published = formData.get("published") === "on" ? "true" : "false";

  if (!title || !instructorId) {
    redirect("/dashboard?error=Title%20and%20instructor%20are%20required");
  }

  const db = await getDb();
  const instructor = await db.query.users.findFirst({
    columns: { id: true, role: true },
    where: eq(users.id, instructorId),
  });

  if (!instructor || instructor.role !== "instructor") {
    redirect("/dashboard?error=Instructor%20not%20found");
  }

  const id = crypto.randomUUID();

  await db.insert(courses).values({
    id,
    title,
    description,
    published,
    instructorId,
  });

  redirect("/dashboard");
}

export async function deleteCourseAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) redirect("/auth/login");
  const courseId = (formData.get("courseId") as string | null)?.trim();
  if (!courseId) {
    redirect("/dashboard?error=Missing%20course");
  }

  const db = await getDb();
  await db.delete(courses).where(eq(courses.id, courseId));
  redirect("/dashboard?notice=Course%20deleted");
}
