"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { requireAdmin, requireInstructor } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { enrollments, users } from "@/lib/schema";

export async function enrollLearnerAction(formData: FormData) {
  const courseId = (formData.get("courseId") as string | null)?.trim();
  const emailRaw = (formData.get("email") as string | null)?.trim().toLowerCase();

  if (!courseId || !emailRaw) {
    redirect(`/courses/${courseId}?error=Missing%20course%20or%20email`);
  }

  const db = await getDb();

  // Only admins or instructors who own the course may enroll.
  // Instructors check happens implicitly by joining with course ownership.
  const instructor = await requireInstructor().catch(() => null);
  const admin = instructor ? null : await requireAdmin().catch(() => null);

  if (!instructor && !admin) {
    redirect(`/courses/${courseId}?error=Not%20authorized%20to%20enroll%20learners`);
  }

  // Validate course ownership for instructors
  if (instructor) {
    const ownership = await db.query.courses.findFirst({
      columns: { id: true },
      where: (c, { eq }) => eq(c.id, courseId) && eq(c.instructorId, instructor.id),
    });
    if (!ownership) {
      redirect(`/courses/${courseId}?error=You%20do%20not%20own%20this%20course`);
    }
  }

  const learner = await db.query.users.findFirst({
    where: eq(users.email, emailRaw),
  });

  if (!learner || learner.role !== "learner") {
    redirect(`/courses/${courseId}?error=User%20must%20exist%20and%20be%20a%20learner`);
  }

  const existing = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) => and(eq(e.userId, learner.id), eq(e.courseId, courseId)),
  });

  if (existing) {
    redirect(`/courses/${courseId}?notice=Already%20enrolled`);
  }

  await db.insert(enrollments).values({
    id: crypto.randomUUID(),
    userId: learner.id,
    courseId,
  });

  redirect(`/courses/${courseId}?notice=Enrolled%20successfully`);
}
