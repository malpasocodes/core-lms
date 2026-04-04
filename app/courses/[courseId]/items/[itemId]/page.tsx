import { notFound, redirect } from "next/navigation";

import Link from "next/link";
import { and, eq } from "drizzle-orm";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { contentItems, courses, modules, sections } from "@/lib/schema";
import { markContentCompleteAction } from "@/lib/progress-actions";
import { NormalizedContentRenderer } from "@/components/normalized-content-renderer";
import { MarkdownItemEditor } from "@/components/markdown-item-editor";

type ItemPageProps = {
  params: Promise<{ courseId: string; itemId: string }>;
};

export default async function CourseItemPage(props: ItemPageProps) {
  const { courseId, itemId } = (await props.params) || {};
  if (!courseId || !itemId) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      itemId: contentItems.id,
      itemTitle: contentItems.title,
      itemType: contentItems.type,
      itemContent: contentItems.content,
      itemContentPayload: contentItems.contentPayload,
      sectionId: sections.id,
      sectionTitle: sections.title,
      moduleTitle: modules.title,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(contentItems)
    .leftJoin(sections, eq(contentItems.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(and(eq(contentItems.id, itemId), eq(courses.id, courseId)))
    .limit(1);

  const item = itemRow[0];
  if (!item) notFound();

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";

  let isEnrolled = false;
  let isCompleted = false;
  if (user.role === "learner") {
    const enrollment = await db.query.enrollments.findFirst({
      columns: { id: true },
      where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
    });
    isEnrolled = Boolean(enrollment);
    if (enrollment) {
      const completion = await db.query.completions.findFirst({
        columns: { id: true },
        where: (c, { and, eq }) => and(eq(c.contentItemId, itemId), eq(c.userId, user.id)),
      });
      isCompleted = Boolean(completion);
    }
  }

  if (!(isAdmin || isOwner || isEnrolled)) {
    redirect("/dashboard?error=Not%20enrolled%20in%20this%20course");
  }

  const siblings =
    item.sectionId && typeof item.sectionId === "string"
      ? await db
          .select({
            id: contentItems.id,
            title: contentItems.title,
          })
          .from(contentItems)
          .where(eq(contentItems.sectionId, item.sectionId))
          .orderBy(contentItems.order)
      : [];

  const idx = siblings.findIndex((s) => s.id === itemId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Content item</p>
        <h1 className="text-3xl font-semibold text-foreground">{item.itemTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {item.sectionTitle} — {item.moduleTitle} •{" "}
          <Link className="text-foreground underline" href={`/courses/${courseId}`}>
            {courseId}
          </Link>
        </p>
      </div>

      {item.itemType === "markdown" && (isOwner || isAdmin) ? (
        <MarkdownItemEditor
          itemId={itemId}
          initialTitle={item.itemTitle}
          initialContent={item.itemContent}
          redirectTo={`/courses/${courseId}/items/${itemId}`}
        />
      ) : (
      <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10">
        {item.itemType === "normalized_text" && item.itemContentPayload ? (
          <NormalizedContentRenderer blocks={JSON.parse(item.itemContentPayload)} />
        ) : item.itemType === "page" ? (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-foreground/90 leading-7">{item.itemContent}</p>
          </div>
        ) : item.itemType === "markdown" ? (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{item.itemContent}</ReactMarkdown>
          </div>
        ) : item.itemType === "pdf" ? (
          <div className="space-y-3">
            <iframe
              src={item.itemContent}
              className="w-full rounded border border-border/60"
              style={{ height: "80vh" }}
            />
            <a
              href={item.itemContent}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-foreground underline hover:text-primary transition-colors"
            >
              Open PDF in new tab
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">External link</p>
            <a className="text-foreground underline hover:text-primary transition-colors" href={item.itemContent} target="_blank" rel="noreferrer">
              {item.itemContent}
            </a>
          </div>
        )}
      </div>
      )}

      <div className="flex items-center justify-between">
        {prev ? (
          <Link className="text-sm font-semibold text-foreground underline" href={`/courses/${courseId}/items/${prev.id}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {user.role === "learner" ? (
            <form action={markContentCompleteAction}>
              <input type="hidden" name="itemId" value={itemId} />
              <Button type="submit" variant="outline" disabled={isCompleted}>
                {isCompleted ? "Completed" : "Mark complete"}
              </Button>
            </form>
          ) : null}
          {next ? (
            <Link className="text-sm font-semibold text-foreground underline" href={`/courses/${courseId}/items/${next.id}`}>
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
