import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { and, asc, eq, gt, lt, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  courseReferenceBooks,
  courses,
  openstaxBooks,
  openstaxChapters,
  openstaxSections,
} from "@/lib/schema";
import { CourseTabs } from "../../../_components/course-tabs";

export default async function CourseReferenceSectionPage({
  params,
}: {
  params: Promise<{ courseId: string; bookId: string; sectionId: string }>;
}) {
  const { courseId, bookId, sectionId } = await params;
  if (!courseId || !bookId || !sectionId) notFound();

  const db = await getDb();
  const [course, user] = await Promise.all([
    db.query.courses.findFirst({ where: eq(courses.id, courseId) }),
    getCurrentUser(),
  ]);
  if (!course) notFound();
  if (!user) redirect("/sign-in");

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
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

  const canEdit = isAdmin || isOwner;

  const attachment = await db.query.courseReferenceBooks.findFirst({
    where: and(
      eq(courseReferenceBooks.courseId, courseId),
      eq(courseReferenceBooks.openstaxBookId, bookId),
    ),
  });
  if (!attachment) notFound();

  const row = await db
    .select({
      section: openstaxSections,
      chapter: openstaxChapters,
      book: openstaxBooks,
    })
    .from(openstaxSections)
    .innerJoin(openstaxChapters, eq(openstaxSections.chapterId, openstaxChapters.id))
    .innerJoin(openstaxBooks, eq(openstaxChapters.bookId, openstaxBooks.id))
    .where(eq(openstaxSections.id, sectionId))
    .limit(1);

  const data = row[0];
  if (!data || data.book.id !== bookId) notFound();

  // Find prev/next within the same chapter for simple navigation.
  const [nextRow, prevRow] = await Promise.all([
    db
      .select({ id: openstaxSections.id, title: openstaxSections.title })
      .from(openstaxSections)
      .where(
        and(
          eq(openstaxSections.chapterId, data.chapter.id),
          gt(openstaxSections.order, data.section.order),
        ),
      )
      .orderBy(asc(openstaxSections.order))
      .limit(1),
    db
      .select({ id: openstaxSections.id, title: openstaxSections.title })
      .from(openstaxSections)
      .where(
        and(
          eq(openstaxSections.chapterId, data.chapter.id),
          lt(openstaxSections.order, data.section.order),
        ),
      )
      .orderBy(desc(openstaxSections.order))
      .limit(1),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Course</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {course.title}
          </h1>
        </div>
        <Suspense fallback={<div className="h-9" />}>
          <CourseTabs courseId={courseId} canEdit={canEdit} />
        </Suspense>
      </div>

      <div>
        <Link
          href={`/courses/${courseId}/reference/${bookId}`}
          className="text-xs text-slate-500 underline"
        >
          ← {data.book.title}
        </Link>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
          Chapter {data.chapter.chapterNumber} · {data.chapter.title}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">{data.section.title}</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 md:px-10 md:py-10">
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: data.section.contentHtml ?? "" }}
        />
      </div>

      <div className="flex items-center justify-between gap-4 text-xs">
        {prevRow[0] ? (
          <Link
            href={`/courses/${courseId}/reference/${bookId}/${prevRow[0].id}`}
            className="text-slate-700 underline hover:text-slate-900"
          >
            ← {prevRow[0].title}
          </Link>
        ) : (
          <span />
        )}
        {nextRow[0] ? (
          <Link
            href={`/courses/${courseId}/reference/${bookId}/${nextRow[0].id}`}
            className="text-slate-700 underline hover:text-slate-900"
          >
            {nextRow[0].title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
