"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { announcements, courses } from "@/lib/schema";

async function assertCanPost(courseId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const course = await db.query.courses.findFirst({
    columns: { id: true, instructorId: true },
    where: (c, { eq }) => eq(c.id, courseId),
  });
  if (!course) redirect("/courses?error=Course%20not%20found");

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) redirect(`/courses/${courseId}?error=Not%20authorized`);

  return { user, db };
}

export async function createAnnouncementAction(formData: FormData) {
  const courseId = (formData.get("courseId") as string | null)?.trim();
  const body = (formData.get("body") as string | null)?.trim();

  if (!courseId || !body) redirect("/dashboard?error=Missing%20fields");

  const { user, db } = await assertCanPost(courseId);

  await db.insert(announcements).values({
    id: crypto.randomUUID(),
    courseId,
    authorId: user.id,
    body,
  });

  redirect(`/courses/${courseId}?tab=announcements&notice=Announcement%20posted`);
}

export async function deleteAnnouncementAction(formData: FormData) {
  const courseId = (formData.get("courseId") as string | null)?.trim();
  const announcementId = (formData.get("announcementId") as string | null)?.trim();

  if (!courseId || !announcementId) redirect("/dashboard?error=Missing%20fields");

  const { db } = await assertCanPost(courseId!);

  await db
    .delete(announcements)
    .where(and(eq(announcements.id, announcementId!), eq(announcements.courseId, courseId!)));

  redirect(`/courses/${courseId}?tab=announcements&notice=Announcement%20deleted`);
}
