import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDb, sql } from "@/lib/db";
import { courses, enrollments, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const db = await getDb();
  const courseList = await db
    .select({
      id: courses.id,
      title: courses.title,
      instructorEmail: users.email,
      learnerCount: sql<number>`count(${enrollments.id})`,
    })
    .from(courses)
    .leftJoin(users, eq(courses.instructorId, users.id))
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .groupBy(courses.id, users.email)
    .orderBy(courses.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Fast access to admin-only course list.</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-sm font-semibold text-slate-900">Courses</p>
          <p className="text-xs text-slate-500">Name, instructor, enrolled learners.</p>
        </div>
        {courseList.length === 0 ? (
          <p className="text-sm text-slate-500">No courses available.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <div className="grid grid-cols-[2fr_1.5fr_0.5fr] bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Course</span>
              <span>Instructor</span>
              <span className="text-right">Enrollees</span>
            </div>
            <div className="divide-y divide-slate-200 bg-white text-sm text-slate-900">
              {courseList.map((course) => (
                <div key={course.id} className="grid grid-cols-[2fr_1.5fr_0.5fr] items-center px-3 py-2">
                  <div className="space-y-0.5">
                    <Link className="text-sm font-semibold underline" href={`/courses/${course.id}`}>
                      {course.title}
                    </Link>
                    <p className="text-[11px] text-slate-500 font-mono">{course.id}</p>
                  </div>
                  <span className="text-sm text-slate-900">
                    {course.instructorEmail ?? "Unassigned"}
                  </span>
                  <span className="text-right text-sm font-semibold">
                    {Number(course.learnerCount ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
