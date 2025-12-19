"use server";

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { contentItems, courses, modules } from "@/lib/schema";

export async function createModuleAction(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim();
  const courseId = (formData.get("courseId") as string | null)?.trim();
  if (!title || !courseId) {
    redirect(`/courses/${courseId}?error=Missing%20course%20or%20title`);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = await getDb();
  const course = await db.query.courses.findFirst({
    columns: { id: true, instructorId: true },
    where: (c, { eq }) => eq(c.id, courseId),
  });
  if (!course) redirect("/dashboard?error=Course%20not%20found");

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${courseId}?error=Not%20authorized`);
  }

  const last = await db
    .select({ order: modules.order })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(modules).values({
    id: crypto.randomUUID(),
    courseId,
    title,
    order: nextOrder,
  });

  redirect(`/courses/${courseId}`);
}

export async function createContentItemAction(formData: FormData) {
  const moduleId = (formData.get("moduleId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim();

  if (!moduleId || !title || !type || !content) {
    redirect(`/dashboard?error=Missing%20content%20fields`);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = await getDb();
  const moduleRow = await db
    .select({
      moduleId: modules.id,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(modules)
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(modules.id, moduleId))
    .limit(1);

  const module = moduleRow[0];

  if (!module || !module.courseId) {
    redirect("/dashboard?error=Module%20not%20found");
  }

  const course = { id: module.courseId, instructorId: module.instructorId };
  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${course.id}?error=Not%20authorized`);
  }

  if (type !== "page" && type !== "link") {
    redirect(`/courses/${course.id}?error=Invalid%20content%20type`);
  }

  const last = await db
    .select({ order: contentItems.order })
    .from(contentItems)
    .where(eq(contentItems.moduleId, moduleId))
    .orderBy(desc(contentItems.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(contentItems).values({
    id: crypto.randomUUID(),
    moduleId,
    title,
    type,
    content,
    order: nextOrder,
  });

  redirect(`/courses/${course.id}`);
}
