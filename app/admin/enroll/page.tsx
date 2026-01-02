import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, enrollments, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { enrollLearnerAction } from "@/lib/enrollment-actions";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminEnrollPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const db = await getDb();
  const [courseList, learners, currentEnrollments] = await Promise.all([
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(courses.createdAt),
    db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "learner")),
    db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        learnerEmail: users.email,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .leftJoin(users, eq(enrollments.userId, users.id))
      .where(eq(users.role, "learner"))
      .orderBy(courses.title, users.email),
  ]);

  const enrollmentMap = courseList.map((course) => ({
    ...course,
    learners: currentEnrollments
      .filter((row) => row.courseId === course.id && row.learnerEmail)
      .map((row) => row.learnerEmail as string),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Enroll</h1>
        <p className="text-sm text-muted-foreground">
          Enroll an existing learner into an existing course.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enroll learner</CardTitle>
          <CardDescription>
            This form only enrolls existing learners into existing courses. Use Roster to create users first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={enrollLearnerAction} className="space-y-4 text-sm">
            <div className="space-y-1">
              <Label htmlFor="course-select">Course</Label>
              <select
                id="course-select"
                name="courseId"
                required
                className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a course
                </option>
                {courseList.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="learner-email">Learner</Label>
              <select
                id="learner-email"
                name="email"
                required
                className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a learner
                </option>
                {learners.map((learner) => (
                  <option key={learner.id} value={learner.email}>
                    {learner.email}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full">
              Enroll learner
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current enrollments</CardTitle>
          <CardDescription>Expand a course to view enrolled learners.</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollmentMap.every((c) => c.learners.length === 0) ? (
            <p className="text-sm text-muted-foreground">No enrollments yet.</p>
          ) : (
            <div className="space-y-2">
              {enrollmentMap.map((course) => (
                <details
                  key={course.id}
                  className="overflow-hidden rounded-md border border-border/70 bg-background/80 text-sm text-foreground"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-3 py-2">
                    <div className="space-y-0.5">
                      <span className="font-semibold">{course.title}</span>
                      <p className="text-[11px] text-muted-foreground font-mono">{course.id}</p>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {course.learners.length} enrolled
                    </span>
                  </summary>
                  {course.learners.length === 0 ? (
                    <div className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
                      No learners enrolled.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border border-t border-border/70">
                      {course.learners.map((email) => (
                        <li key={email} className="px-3 py-2 text-sm">
                          {email}
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
