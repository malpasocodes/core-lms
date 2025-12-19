import Link from "next/link";

import { getDb } from "@/lib/db";
import { courses, users } from "@/lib/schema";

export default async function AdminPage() {
  const db = await getDb();
  const [courseList, userCount] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        published: courses.published,
        createdAt: courses.createdAt,
      })
      .from(courses)
      .orderBy(courses.createdAt),
    db.select({ count: users.id }).from(users),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Minimal operational view: audit users and courses. Read-only in v0.1.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm text-foreground/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Users</p>
            <p className="text-lg font-semibold">{userCount[0]?.count ?? 0}</p>
          </div>
          <Link href="/admin/seed" className="text-xs font-semibold text-foreground underline">
            Seed demo users
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Courses</h2>
        {courseList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No courses yet.</p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border/70 bg-card/70 text-sm">
            {courseList.map((course) => (
              <div key={course.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.id}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {course.published === "true" ? "Published" : "Draft"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
