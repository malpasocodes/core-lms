"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureUserInDb } from "@/lib/user-sync";
import { activities, completions, modules, sections } from "@/lib/schema";

export async function markActivityCompleteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "learner") {
    redirect("/sign-in");
  }

  await ensureUserInDb();

  const activityId = (formData.get("activityId") as string | null)?.trim();
  if (!activityId) {
    redirect("/dashboard?error=Missing%20activity");
  }

  const db = await getDb();
  const itemRow = await db
    .select({
      activityId: activities.id,
      courseId: modules.courseId,
    })
    .from(activities)
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .where(eq(activities.id, activityId))
    .limit(1);

  const item = itemRow[0];
  if (!item || !item.courseId) {
    redirect("/dashboard?error=Activity%20not%20found");
  }

  const enrollment = await db.query.enrollments.findFirst({
    columns: { id: true },
    where: (e, { and, eq }) =>
      and(
        eq(e.courseId, item.courseId as string),
        eq(e.userId, user.id)
      ),
  });
  if (!enrollment) {
    redirect("/dashboard?error=Not%20enrolled%20for%20this%20course");
  }

  await db
    .insert(completions)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      activityId: item.activityId,
    })
    .onConflictDoNothing();

  redirect(`/courses/${item.courseId}/activities/${item.activityId}?notice=Completed`);
}
