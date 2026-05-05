"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courseReferenceBooks, courses, openstaxBooks } from "@/lib/schema";

async function assertCanManage(courseId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const course = await db.query.courses.findFirst({
    columns: { id: true, instructorId: true },
    where: eq(courses.id, courseId),
  });
  if (!course) redirect("/dashboard?error=Course+not+found");

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    redirect(`/courses/${courseId}?error=${encodeURIComponent("Not authorized")}`);
  }
}

export async function attachReferenceBookAction(formData: FormData) {
  const courseId = (formData.get("courseId") as string | null)?.trim();
  const openstaxBookId = (formData.get("openstaxBookId") as string | null)?.trim();
  if (!courseId || !openstaxBookId) {
    redirect("/dashboard?error=Missing+course+or+book");
  }

  await assertCanManage(courseId!);

  const db = await getDb();
  const book = await db.query.openstaxBooks.findFirst({
    columns: { id: true },
    where: eq(openstaxBooks.id, openstaxBookId!),
  });
  if (!book) {
    redirect(`/courses/${courseId}?tab=import&error=${encodeURIComponent("Book not found")}`);
  }

  const existing = await db.query.courseReferenceBooks.findFirst({
    where: and(
      eq(courseReferenceBooks.courseId, courseId!),
      eq(courseReferenceBooks.openstaxBookId, openstaxBookId!),
    ),
  });
  if (!existing) {
    await db.insert(courseReferenceBooks).values({
      id: crypto.randomUUID(),
      courseId: courseId!,
      openstaxBookId: openstaxBookId!,
    });
  }

  redirect(
    `/courses/${courseId}?tab=import&notice=${encodeURIComponent("Reference book attached")}`,
  );
}

export async function detachReferenceBookAction(formData: FormData) {
  const courseId = (formData.get("courseId") as string | null)?.trim();
  const openstaxBookId = (formData.get("openstaxBookId") as string | null)?.trim();
  if (!courseId || !openstaxBookId) {
    redirect("/dashboard?error=Missing+course+or+book");
  }

  await assertCanManage(courseId!);

  const db = await getDb();
  await db
    .delete(courseReferenceBooks)
    .where(
      and(
        eq(courseReferenceBooks.courseId, courseId!),
        eq(courseReferenceBooks.openstaxBookId, openstaxBookId!),
      ),
    );

  redirect(
    `/courses/${courseId}?tab=import&notice=${encodeURIComponent("Reference book removed")}`,
  );
}
