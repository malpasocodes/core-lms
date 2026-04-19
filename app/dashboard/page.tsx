import { redirect } from "next/navigation";
import Link from "next/link";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { courses, enrollments } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { CourseList } from "./_components/course-list";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (user?.role === "admin") {
    redirect("/admin");
  }

  const db = user ? await getDb() : null;

  const isInstructor = user?.role === "instructor";

  type CourseRow = { id: string; title: string; published: "true" | "false" };

  let activeCourses: CourseRow[] = [];
  let enrolledCount = 0;

  if (user && db) {
    if (isInstructor) {
      activeCourses = await db
        .select({ id: courses.id, title: courses.title, published: courses.published })
        .from(courses)
        .where(eq(courses.instructorId, user.id));
    } else {
      const rows = await db
        .select({ id: courses.id, title: courses.title, published: courses.published })
        .from(enrollments)
        .leftJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.userId, user.id));
      activeCourses = rows.filter(
        (c): c is CourseRow => Boolean(c.id && c.title && c.published)
      );
      const [{ value }] = await db
        .select({ value: count() })
        .from(enrollments)
        .where(eq(enrollments.userId, user.id));
      enrolledCount = value;
    }
  }

  const courseCount = activeCourses.length;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        {user && (
          <p className="mt-1 text-sm text-slate-500 capitalize">
            {user.role} · {user.email}
          </p>
        )}
      </div>

      {/* 3-col grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2/3 — course list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              {isInstructor ? "Your Courses" : "Enrolled Courses"}
            </h2>
            <CourseList
              heading=""
              emptyText={
                isInstructor
                  ? "No courses yet. Create one to get started."
                  : "You are not enrolled in any courses yet."
              }
              courses={activeCourses}
            />
            {isInstructor && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <Link
                  href="/instructor/enroll"
                  className="text-sm font-medium text-teal-700 hover:text-teal-600"
                >
                  Manage enrollments →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3 — widgets */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Overview</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {isInstructor ? "Courses" : "Enrolled"}
                </span>
                <span className="font-semibold text-slate-900">{courseCount}</span>
              </div>
              {!isInstructor && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total enrollments</span>
                  <span className="font-semibold text-slate-900">{enrolledCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Quick Actions</h2>
            <div className="space-y-2 text-sm">
              <Link
                href="/courses"
                className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Browse courses →
              </Link>
              {isInstructor && (
                <Link
                  href="/courses/content"
                  className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Manage content →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
