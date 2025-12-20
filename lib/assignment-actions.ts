"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assignments, courses, enrollments, submissions } from "@/lib/schema";

export async function createAssignmentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const courseId = (formData.get("courseId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const description = ((formData.get("description") as string | null) || "").trim();

  if (!courseId || !title) {
    redirect("/dashboard?error=Missing%20course%20or%20title");
  }

  const db = await getDb();
  const course = await db.query.courses.findFirst({
    columns: { id: true, instructorId: true },
    where: (c, { eq }) => eq(c.id, courseId),
  });

  if (!course) {
    redirect("/courses?error=Course%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!(isOwner || isAdmin)) {
    redirect(`/courses/${courseId}?error=Not%20authorized`);
  }

  await db.insert(assignments).values({
    id: crypto.randomUUID(),
    courseId,
    title,
    description,
  });

  redirect(`/courses/${courseId}?notice=Assignment%20created`);
}

export async function submitAssignmentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  if (user.role !== "learner") {
    redirect("/dashboard?error=Only%20learners%20can%20submit");
  }

  const assignmentId = (formData.get("assignmentId") as string | null)?.trim();
  const rawText = (formData.get("submissionText") as string | null) || "";
  const rawFile = (formData.get("fileUrl") as string | null) || "";
  const submissionText = rawText.trim();
  const fileUrl = rawFile.trim();

  if (!assignmentId) {
    redirect("/dashboard?error=Missing%20assignment");
  }

  const db = await getDb();
  const assignment = await db.query.assignments.findFirst({
    columns: { id: true, courseId: true },
    where: (a, { eq }) => eq(a.id, assignmentId),
  });

  if (!assignment) {
    redirect("/dashboard?error=Assignment%20not%20found");
  }

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) => and(eq(e.courseId, assignment.courseId), eq(e.userId, user.id)),
  });

  if (!enrollment) {
    redirect(`/courses/${assignment.courseId}?error=Not%20enrolled`);
  }

  if (!submissionText && !fileUrl) {
    redirect(
      `/courses/${assignment.courseId}/assignments/${assignmentId}?error=Provide%20text%20or%20file%20URL`
    );
  }

  const now = new Date();
  await db
    .insert(submissions)
    .values({
      id: crypto.randomUUID(),
      assignmentId,
      userId: user.id,
      submissionText: submissionText || null,
      fileUrl: fileUrl || null,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [submissions.assignmentId, submissions.userId],
      set: {
        submissionText: submissionText || null,
        fileUrl: fileUrl || null,
        submittedAt: now,
      },
    });

  redirect(`/courses/${assignment.courseId}/assignments/${assignmentId}?notice=Submission%20saved`);
}
