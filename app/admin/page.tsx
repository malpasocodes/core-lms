import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDb, sql } from "@/lib/db";
import { courses, enrollments, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fast access to admin-only course list.</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Courses</p>
          <p className="text-xs text-muted-foreground">Name, instructor, enrolled learners.</p>
        </div>
        {courseList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses available.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border/70">
            <div className="grid grid-cols-[2fr_1.5fr_0.5fr] bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Course</span>
              <span>Instructor</span>
              <span className="text-right">Enrollees</span>
            </div>
            <div className="divide-y divide-border bg-background/80 text-sm text-foreground">
              {courseList.map((course) => (
                <div key={course.id} className="grid grid-cols-[2fr_1.5fr_0.5fr] items-center px-3 py-2">
                  <div className="space-y-0.5">
                    <Link className="text-sm font-semibold underline" href={`/courses/${course.id}`}>
                      {course.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground font-mono">{course.id}</p>
                  </div>
                  <span className="text-sm text-foreground">
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
