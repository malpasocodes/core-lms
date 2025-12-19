import { notFound, redirect } from "next/navigation";

import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { contentItems, courses, enrollments, modules } from "@/lib/schema";

type ItemPageProps = {
  params: Promise<{ courseId: string; itemId: string }>;
};

export default async function CourseItemPage(props: ItemPageProps) {
  const { courseId, itemId } = (await props.params) || {};
  if (!courseId || !itemId) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = await getDb();
  const itemRow = await db
    .select({
      itemId: contentItems.id,
      itemTitle: contentItems.title,
      itemType: contentItems.type,
      itemContent: contentItems.content,
      moduleId: modules.id,
      moduleTitle: modules.title,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(contentItems)
    .leftJoin(modules, eq(contentItems.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(and(eq(contentItems.id, itemId), eq(courses.id, courseId)))
    .limit(1);

  const item = itemRow[0];
  if (!item) notFound();

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";

  let isEnrolled = false;
  if (user.role === "learner") {
    const enrollment = await db.query.enrollments.findFirst({
      columns: { id: true },
      where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
    });
    isEnrolled = Boolean(enrollment);
  }

  if (!(isAdmin || isOwner || isEnrolled)) {
    redirect("/dashboard?error=Not%20enrolled%20in%20this%20course");
  }

  const siblings = await db
    .select({
      id: contentItems.id,
      title: contentItems.title,
    })
    .from(contentItems)
    .where(eq(contentItems.moduleId, item.moduleId))
    .orderBy(contentItems.order);

  const idx = siblings.findIndex((s) => s.id === itemId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Content item</p>
        <h1 className="text-3xl font-semibold text-foreground">{item.itemTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Module: {item.moduleTitle} • Course:{" "}
          <Link className="text-foreground underline" href={`/courses/${courseId}`}>
            {courseId}
          </Link>
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-4 text-sm text-foreground">
        {item.itemType === "page" ? (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-foreground">{item.itemContent}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground">External link</p>
            <a className="text-foreground underline" href={item.itemContent} target="_blank" rel="noreferrer">
              {item.itemContent}
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {prev ? (
          <Link className="text-sm font-semibold text-foreground underline" href={`/courses/${courseId}/items/${prev.id}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="text-sm font-semibold text-foreground underline" href={`/courses/${courseId}/items/${next.id}`}>
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
