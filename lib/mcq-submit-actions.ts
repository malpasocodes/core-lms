"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assignments, enrollments, grades, mcqQuestions, submissions } from "@/lib/schema";

export async function submitMcqAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role !== "learner") redirect("/dashboard?error=Only%20learners%20can%20submit");

  const assignmentId = (formData.get("assignmentId") as string | null)?.trim();
  if (!assignmentId) redirect("/dashboard?error=Missing%20assignment");

  const db = await getDb();

  const assignment = await db.query.assignments.findFirst({
    columns: { id: true, courseId: true },
    where: (a, { eq }) => eq(a.id, assignmentId),
  });
  if (!assignment) redirect("/dashboard?error=Assignment%20not%20found");

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) =>
      and(eq(e.courseId, assignment.courseId), eq(e.userId, user.id)),
  });
  if (!enrollment) redirect(`/courses/${assignment.courseId}?error=Not%20enrolled`);

  const questions = await db.query.mcqQuestions.findMany({
    where: (q, { eq }) => eq(q.assignmentId, assignmentId),
    orderBy: (q, { asc }) => [asc(q.order)],
  });
  if (questions.length === 0) redirect(`/courses/${assignment.courseId}?error=No%20questions`);

  // Parse selected answers from FormData
  const answers: Record<string, number> = {};
  for (const q of questions) {
    const val = formData.get(`answer_${q.id}`);
    if (val !== null) answers[q.id] = parseInt(val as string, 10);
  }

  // Auto-grade
  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) correct++;
  }
  const score = Math.round((correct / questions.length) * 100);

  const now = new Date();

  const existing = await db.query.submissions.findFirst({
    columns: { id: true },
    where: (s, { and, eq }) =>
      and(eq(s.assignmentId, assignmentId), eq(s.userId, user.id)),
  });

  if (existing) {
    await db
      .update(submissions)
      .set({ mcqAnswers: JSON.stringify(answers), submittedAt: now })
      .where(eq(submissions.id, existing.id));
    await db
      .insert(grades)
      .values({ id: crypto.randomUUID(), submissionId: existing.id, score, gradedBy: null, gradedAt: now })
      .onConflictDoUpdate({
        target: grades.submissionId,
        set: { score, gradedAt: now },
      });
  } else {
    const submissionId = crypto.randomUUID();
    await db.insert(submissions).values({
      id: submissionId,
      assignmentId,
      userId: user.id,
      mcqAnswers: JSON.stringify(answers),
      submittedAt: now,
    });
    await db.insert(grades).values({
      id: crypto.randomUUID(),
      submissionId,
      score,
      gradedBy: null,
      gradedAt: now,
    });
  }

  redirect(`/courses/${assignment.courseId}/assignments/${assignmentId}?notice=Submitted`);
}
