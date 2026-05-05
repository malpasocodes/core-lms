import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  courseReferenceBooks,
  courses,
  openstaxBooks,
  openstaxChapters,
  openstaxSections,
} from "@/lib/schema";
import { CourseTabs } from "../../_components/course-tabs";

export default async function CourseReferenceBookPage({
  params,
}: {
  params: Promise<{ courseId: string; bookId: string }>;
}) {
  const { courseId, bookId } = await params;
  if (!courseId || !bookId) notFound();

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

  const book = await db.query.openstaxBooks.findFirst({
    where: eq(openstaxBooks.id, bookId),
  });
  if (!book) notFound();

  const chapters = await db
    .select()
    .from(openstaxChapters)
    .where(eq(openstaxChapters.bookId, bookId))
    .orderBy(openstaxChapters.chapterNumber);

  const sectionsByChapter = await Promise.all(
    chapters.map(async (ch) => {
      const sections = await db
        .select({
          id: openstaxSections.id,
          title: openstaxSections.title,
          order: openstaxSections.order,
        })
        .from(openstaxSections)
        .where(eq(openstaxSections.chapterId, ch.id))
        .orderBy(openstaxSections.order);
      return { chapter: ch, sections };
    }),
  );

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
          href={`/courses/${courseId}/reference`}
          className="text-xs text-slate-500 underline"
        >
          ← Reference Books
        </Link>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{book.title}</h2>
        {book.subject && <p className="text-sm text-slate-500">{book.subject}</p>}
      </div>

      <div className="space-y-3">
        {sectionsByChapter.length === 0 ? (
          <p className="text-sm text-slate-500">No chapters available.</p>
        ) : (
          sectionsByChapter.map(({ chapter, sections }) => (
            <div
              key={chapter.id}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Chapter {chapter.chapterNumber}
                </p>
                <p className="text-sm font-semibold text-slate-900">{chapter.title}</p>
              </div>
              {sections.length > 0 && (
                <ul className="pl-3 border-l border-slate-200 space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/courses/${courseId}/reference/${bookId}/${s.id}`}
                        className="text-xs text-slate-700 underline hover:text-slate-900"
                      >
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
