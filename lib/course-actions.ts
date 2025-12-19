"use server";

import { redirect } from "next/navigation";

import { requireInstructor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses } from "@/lib/schema";

export async function createCourseAction(formData: FormData) {
  const instructor = await requireInstructor();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || "";
  const published = formData.get("published") === "on" ? "true" : "false";

  if (!title) {
    redirect("/dashboard?error=Title%20is%20required");
  }

  const db = await getDb();
  const id = crypto.randomUUID();

  await db.insert(courses).values({
    id,
    title,
    description,
    published,
    instructorId: instructor.id,
  });

  redirect("/dashboard");
}
