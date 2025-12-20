import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkDatabaseConnection, getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { courses, enrollments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { CourseForm } from "./_components/course-form";
import { CourseList } from "./_components/course-list";

export default async function DashboardPage() {
  const [dbStatus, user] = await Promise.all([
    checkDatabaseConnection(),
    getCurrentUser(),
  ]);

  if (user?.role === "admin") {
    redirect("/admin");
  }

  const db = user ? await getDb() : null;

  const [ownedCourses, learnerCourses] =
    user && db
      ? await Promise.all([
          db
            .select({
              id: courses.id,
              title: courses.title,
              published: courses.published,
            })
            .from(courses)
            .where(eq(courses.instructorId, user.id)),
          db
            .select({
              id: courses.id,
              title: courses.title,
              published: courses.published,
            })
            .from(enrollments)
            .leftJoin(courses, eq(enrollments.courseId, courses.id))
            .where(eq(enrollments.userId, user.id)),
        ])
      : [[], []];

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl border border-border/60 bg-card/80 px-6 py-6 shadow-sm shadow-muted">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Instructor Dashboard
          </h1>
        </div>
        {user ? (
          <div className="flex items-center gap-4 text-sm text-foreground/80">
            <Badge variant="outline" className="text-xs">
              {user.role}
            </Badge>
            <span className="font-mono text-xs">{user.email}</span>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>
              Role-aware course lists appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            {user?.role === "instructor" ? (
              <CourseList
                heading="Owned courses"
                emptyText="No courses yet. Create one to get started."
                courses={ownedCourses}
              />
            ) : (
              <CourseList
                heading="Enrolled courses"
                emptyText="No enrolled courses yet."
                courses={learnerCourses.filter((c): c is { id: string; title: string; published: "true" | "false" } => Boolean(c.id && c.title && c.published))}
              />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Removed status/next-steps/why cards for a cleaner instructor view */}
    </div>
  );
}
