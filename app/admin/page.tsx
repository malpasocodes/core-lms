import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses } from "@/lib/schema";

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
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .orderBy(courses.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fast access to admin-only course list.</p>
      </div>

      <div className="space-y-2 rounded-2xl border border-border/70 bg-card/80 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Course list</p>
            <p className="text-xs text-muted-foreground">All courses (admin view).</p>
          </div>
        </div>
        {courseList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses available.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border/70 bg-background/70 text-sm text-foreground">
            {courseList.map((course) => (
              <div key={course.id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <Link className="text-sm font-semibold underline" href={`/courses/${course.id}`}>
                    {course.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{course.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
