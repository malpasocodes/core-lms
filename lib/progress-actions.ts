"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { completions, contentItems, enrollments, modules } from "@/lib/schema";

export async function markContentCompleteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "learner") {
    redirect("/auth/login");
  }

  const itemId = (formData.get("itemId") as string | null)?.trim();
  if (!itemId) {
    redirect("/dashboard?error=Missing%20content%20item");
  }

  const db = await getDb();
  const itemRow = await db
    .select({
      itemId: contentItems.id,
      moduleId: modules.id,
      courseId: modules.courseId,
    })
    .from(contentItems)
    .leftJoin(modules, eq(contentItems.moduleId, modules.id))
    .where(eq(contentItems.id, itemId))
    .limit(1);

  const item = itemRow[0];
  if (!item || !item.moduleId || !item.courseId) {
    redirect("/dashboard?error=Content%20item%20not%20found");
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
      contentItemId: item.itemId,
    })
    .onConflictDoNothing();

  redirect(`/courses/${item.courseId}/items/${item.itemId}?notice=Completed`);
}
