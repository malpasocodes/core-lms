"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, assessments, grades, modules, sections, submissions } from "@/lib/schema";

export async function submitMcqAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (user.role !== "learner") redirect("/dashboard?error=Only%20learners%20can%20submit");

  const assessmentId = (formData.get("assessmentId") as string | null)?.trim();
  if (!assessmentId) redirect("/dashboard?error=Missing%20assessment");

  const db = await getDb();

  const row = await db
    .select({
      assessmentId: assessments.id,
      activityId: activities.id,
      courseId: modules.courseId,
    })
    .from(assessments)
    .leftJoin(activities, eq(assessments.activityId, activities.id))
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .where(eq(assessments.id, assessmentId))
    .limit(1);

  const found = row[0];
  if (!found || !found.courseId || !found.activityId) {
    redirect("/dashboard?error=Assessment%20not%20found");
  }

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) =>
      and(eq(e.courseId, found.courseId as string), eq(e.userId, user.id)),
  });
  if (!enrollment) redirect(`/courses/${found.courseId}?error=Not%20enrolled`);

  const questions = await db.query.mcqQuestions.findMany({
    where: (q, { eq }) => eq(q.assessmentId, assessmentId),
    orderBy: (q, { asc }) => [asc(q.order)],
  });
  if (questions.length === 0) redirect(`/courses/${found.courseId}?error=No%20questions`);

  const answers: Record<string, number> = {};
  for (const q of questions) {
    const val = formData.get(`answer_${q.id}`);
    if (val !== null) answers[q.id] = parseInt(val as string, 10);
  }

  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) correct++;
  }
  const score = Math.round((correct / questions.length) * 100);

  const now = new Date();

  const existing = await db.query.submissions.findFirst({
    columns: { id: true },
    where: (s, { and, eq }) =>
      and(eq(s.assessmentId, assessmentId), eq(s.userId, user.id)),
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
      assessmentId,
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

  redirect(
    `/courses/${found.courseId}/activities/${found.activityId}/assessments/${assessmentId}?notice=Submitted`
  );
}
