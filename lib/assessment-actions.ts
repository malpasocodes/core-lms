"use server";

import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureUserInDb } from "@/lib/user-sync";
import { activities, assessments, courses, grades, modules, sections, submissions } from "@/lib/schema";

async function loadAssessmentContext(db: Awaited<ReturnType<typeof getDb>>, assessmentId: string) {
  const rows = await db
    .select({
      assessmentId: assessments.id,
      activityId: activities.id,
      courseId: modules.courseId,
      instructorId: courses.instructorId,
    })
    .from(assessments)
    .leftJoin(activities, eq(assessments.activityId, activities.id))
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  return rows[0];
}

export async function createAssessmentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const activityId = (formData.get("activityId") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const description = ((formData.get("description") as string | null) || "").trim();
  const typeRaw = (formData.get("type") as string | null)?.trim() || "open_ended";
  const type = typeRaw === "mcq" ? "mcq" : "open_ended";
  const graded = formData.get("graded") === "on";
  const dueAtRaw = (formData.get("dueAt") as string | null)?.trim() || null;
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;

  if (!activityId || !title) {
    redirect("/dashboard?error=Missing%20activity%20or%20title");
  }

  const db = await getDb();
  const ctx = await db
    .select({
      activityId: activities.id,
      courseId: modules.courseId,
      instructorId: courses.instructorId,
    })
    .from(activities)
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(activities.id, activityId))
    .limit(1);

  const found = ctx[0];
  if (!found?.courseId) redirect("/dashboard?error=Activity%20not%20found");

  const isOwner = user.role === "instructor" && user.id === found.instructorId;
  const isAdmin = user.role === "admin";
  if (!(isOwner || isAdmin)) {
    redirect(`/courses/${found.courseId}?error=Not%20authorized`);
  }

  const last = await db
    .select({ order: assessments.order })
    .from(assessments)
    .where(eq(assessments.activityId, activityId))
    .orderBy(desc(assessments.order))
    .limit(1);
  const nextOrder = (last[0]?.order ?? 0) + 1;

  await db.insert(assessments).values({
    id: crypto.randomUUID(),
    activityId,
    type,
    title,
    description: description || null,
    graded,
    dueAt,
    order: nextOrder,
  });

  redirect(`/courses/${found.courseId}/activities/${activityId}?notice=Assessment%20created`);
}

export async function submitAssessmentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await ensureUserInDb();

  if (user.role !== "learner") {
    redirect("/dashboard?error=Only%20learners%20can%20submit");
  }

  const assessmentId = (formData.get("assessmentId") as string | null)?.trim();
  const rawText = (formData.get("submissionText") as string | null) || "";
  const rawFile = (formData.get("fileUrl") as string | null) || "";
  const submissionText = rawText.trim();
  const fileUrl = rawFile.trim();

  if (!assessmentId) {
    redirect("/dashboard?error=Missing%20assessment");
  }

  const db = await getDb();
  const ctx = await loadAssessmentContext(db, assessmentId);

  if (!ctx?.courseId || !ctx.activityId) {
    redirect("/dashboard?error=Assessment%20not%20found");
  }

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) => and(eq(e.courseId, ctx.courseId as string), eq(e.userId, user.id)),
  });

  if (!enrollment) {
    redirect(`/courses/${ctx.courseId}?error=Not%20enrolled`);
  }

  if (!submissionText && !fileUrl) {
    redirect(
      `/courses/${ctx.courseId}/activities/${ctx.activityId}?error=Provide%20text%20or%20file%20URL`
    );
  }

  const now = new Date();
  await db
    .insert(submissions)
    .values({
      id: crypto.randomUUID(),
      assessmentId,
      userId: user.id,
      submissionText: submissionText || null,
      fileUrl: fileUrl || null,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: [submissions.assessmentId, submissions.userId],
      set: {
        submissionText: submissionText || null,
        fileUrl: fileUrl || null,
        submittedAt: now,
      },
    });

  redirect(`/courses/${ctx.courseId}/activities/${ctx.activityId}?notice=Submission%20saved`);
}

export async function gradeSubmissionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  await ensureUserInDb();

  const submissionId = (formData.get("submissionId") as string | null)?.trim();
  const assessmentId = (formData.get("assessmentId") as string | null)?.trim();
  const scoreValue = (formData.get("score") as string | null)?.trim() ?? "";

  if (!submissionId || !assessmentId) {
    redirect("/dashboard?error=Missing%20submission%20or%20assessment");
  }

  const db = await getDb();
  const ctx = await loadAssessmentContext(db, assessmentId);

  if (!ctx?.courseId || !ctx.activityId) {
    redirect("/dashboard?error=Assessment%20not%20found");
  }

  const score = Number(scoreValue);
  const isIntScore = Number.isInteger(score) && score >= 0 && score <= 100;
  if (!isIntScore) {
    redirect(
      `/courses/${ctx.courseId}/activities/${ctx.activityId}?error=Score%20must%20be%20an%20integer%200-100`
    );
  }

  const submission = await db
    .select({
      id: submissions.id,
      assessmentId: submissions.assessmentId,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission.length || submission[0].assessmentId !== assessmentId) {
    redirect("/dashboard?error=Submission%20not%20found");
  }

  const isOwner = user.role === "instructor" && user.id === ctx.instructorId;
  if (!isOwner) {
    redirect(
      `/courses/${ctx.courseId}/activities/${ctx.activityId}?error=Not%20authorized`
    );
  }

  const existingGrade = await db.query.grades.findFirst({
    where: (g, { eq }) => eq(g.submissionId, submissionId),
  });
  if (existingGrade) {
    redirect(
      `/courses/${ctx.courseId}/activities/${ctx.activityId}?error=Submission%20already%20graded`
    );
  }

  await db.insert(grades).values({
    id: crypto.randomUUID(),
    submissionId,
    score,
    gradedBy: user.id,
    gradedAt: new Date(),
  });

  redirect(`/courses/${ctx.courseId}/activities/${ctx.activityId}?notice=Grade%20saved`);
}
