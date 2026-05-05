import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { eq, sql } from "drizzle-orm";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  courseReferenceBooks,
  courses,
  openstaxBooks,
  openstaxChapters,
  openstaxSections,
} from "@/lib/schema";
import { CourseTabs } from "../_components/course-tabs";

export default async function CourseReferenceListPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  if (!courseId) notFound();

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

  const books = await db
    .select({
      id: openstaxBooks.id,
      title: openstaxBooks.title,
      subject: openstaxBooks.subject,
      chapterCount: sql<number>`count(distinct ${openstaxChapters.id})`,
      sectionCount: sql<number>`count(${openstaxSections.id})`,
    })
    .from(courseReferenceBooks)
    .innerJoin(openstaxBooks, eq(courseReferenceBooks.openstaxBookId, openstaxBooks.id))
    .leftJoin(openstaxChapters, eq(openstaxChapters.bookId, openstaxBooks.id))
    .leftJoin(openstaxSections, eq(openstaxSections.chapterId, openstaxChapters.id))
    .where(eq(courseReferenceBooks.courseId, courseId))
    .groupBy(openstaxBooks.id, openstaxBooks.title, openstaxBooks.subject)
    .orderBy(openstaxBooks.title);

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reference Books</CardTitle>
          <CardDescription>
            Read-only textbooks attached to this course for background reading.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {books.length === 0 ? (
            <p className="text-sm text-slate-500">
              No reference books attached to this course.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {books.map((book) => (
                <li key={book.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">{book.title}</p>
                    <p className="text-xs text-slate-500">
                      {Number(book.chapterCount)} chapters · {Number(book.sectionCount)} sections
                      {book.subject ? ` · ${book.subject}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/courses/${courseId}/reference/${book.id}`}
                    className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
