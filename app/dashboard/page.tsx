import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkDatabaseConnection, getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { courses, enrollments, users } from "@/lib/schema";
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

  const [ownedCourses, allCourses, learnerCourses, instructorOptions] =
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
          db.select({ id: courses.id, title: courses.title, published: courses.published }).from(courses),
          db
            .select({
              id: courses.id,
              title: courses.title,
              published: courses.published,
            })
            .from(enrollments)
            .leftJoin(courses, eq(enrollments.courseId, courses.id))
            .where(eq(enrollments.userId, user.id)),
          user.role === "admin"
            ? db
                .select({ id: users.id, email: users.email })
                .from(users)
                .where(eq(users.role, "instructor"))
            : [],
        ])
      : [[], [], [], []];

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl border border-border/60 bg-card/80 px-6 py-6 shadow-sm shadow-muted">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <Badge variant={dbStatus.ready ? "secondary" : "destructive"}>
            {dbStatus.ready ? "DB online" : "DB offline"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          This dashboard is the central anchor for learners and instructors.
          Everything beyond this screen is intentionally deferred—showing that a
          scaffolded LMS can be live without complexity.
        </p>
        {user ? (
          <div className="flex items-center gap-4 text-sm text-foreground/80">
            <Badge variant="outline" className="text-xs">
              {user.role}
            </Badge>
            <span className="font-mono text-xs">{user.email}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You are browsing as a guest. Sign in to see personalized content.
          </p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>
              Production-ready primitives that make the platform demonstrable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Neon Postgres Connection</span>
              <span className="font-mono text-xs text-foreground/80">
                {dbStatus.message}
              </span>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-xs text-foreground/60">
              A basic `SELECT 1` is used server-side to confirm the connection.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>
              Role-aware course lists appear here. Enrollment arrives in Phase 5.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground/80">
            {user?.role === "instructor" ? (
              <CourseList
                heading="Owned courses"
                emptyText="No courses yet. Create one to get started."
                courses={ownedCourses}
              />
            ) : user?.role === "admin" ? (
              <CourseList
                heading="All courses"
                emptyText="No courses yet."
                courses={allCourses}
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

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instructor Tools</CardTitle>
            <CardDescription>
              Authoring and grading tools arrive in Phases 5–14.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2">
              Placeholder: Create courses, add modules, and manage submissions
              will live here once roles and permissions land.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              What we expect to see shortly after Phase 2 completes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-foreground/80">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <p>Auth screens stubbed and ready for Phase 3 wiring.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <p>Courses index and detail routes reachable from the nav.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <p>Layout and nav consistent across all top-level pages.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="my-6 h-px bg-border/70" role="presentation" />

      <section className="rounded-2xl border border-border/80 bg-background/80 px-6 py-6">
        <h2 className="text-lg font-semibold text-foreground">Why this matters</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A live UI shell plus a verified backend connection proves that the
          infrastructure portion of an LMS can be stood up immediately. The
          rest—assignments, progress tracking, grading—can now build on this
          predictable foundation without overinvestment.
        </p>
      </section>
    </div>
  );
}
