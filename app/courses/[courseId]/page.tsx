import { notFound } from "next/navigation";

import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, enrollments, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { enrollLearnerAction } from "@/lib/enrollment-actions";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseDetailPage(props: CoursePageProps) {
  const { courseId } = (await props.params) || {};

  if (!courseId) {
    notFound();
  }

  const db = await getDb();
  const [course, user] = await Promise.all([
    db.query.courses.findFirst({
      where: (c, { eq }) => eq(c.id, courseId),
    }),
    getCurrentUser(),
  ]);

  if (!course) {
    notFound();
  }

  const isOwner = user?.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user?.role === "admin";

  if (!user) {
    redirect("/auth/login");
  }

  let isEnrolled = false;
  if (user?.role === "learner") {
    const enrollment = await db.query.enrollments.findFirst({
      columns: { id: true },
      where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
    });
    isEnrolled = Boolean(enrollment);
  }

  const canView = isAdmin || isOwner || isEnrolled || user?.role === "instructor";
  if (!canView) {
    redirect("/dashboard?error=Not%20enrolled%20in%20this%20course");
  }

  const enrolledLearners =
    (isAdmin || isOwner) &&
    (await db
      .select({
        email: users.email,
      })
      .from(enrollments)
      .leftJoin(users, eq(enrollments.userId, users.id))
      .where(eq(enrollments.courseId, courseId)));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {course.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {course.description || "This is a placeholder for the course overview. Modules and assignments will be added in later phases."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course description</CardTitle>
            <CardDescription>Show high-level context for learners.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Placeholder content. In future phases, this will surface instructor-authored metadata.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Ordered learning materials go here.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No modules yet. Module creation and ordering will land in Phase 8.
          </CardContent>
        </Card>
      </div>

      {isAdmin || isOwner ? (
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled learners</CardTitle>
              <CardDescription>Read-only list of enrolled learners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {enrolledLearners && enrolledLearners.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4">
                  {enrolledLearners.map((row) => (
                    <li key={row.email}>{row.email}</li>
                  ))}
                </ul>
              ) : (
                <p>No learners enrolled yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enroll a learner</CardTitle>
              <CardDescription>Enroll by learner email (must already exist as a learner).</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={enrollLearnerAction} className="space-y-3">
                <input type="hidden" name="courseId" value={courseId} />
                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground">
                    Learner email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
                >
                  Enroll learner
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
