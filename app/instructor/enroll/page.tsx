import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requireInstructor, type Role } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, enrollments, users } from "@/lib/schema";
import { instructorEnrollLearnerAction, unenrollLearnerAction } from "@/lib/enrollment-actions";

export default async function InstructorEnrollPage() {
  const instructor = await requireInstructor();

  const db = await getDb();

  const [myCourses, currentEnrollments] = await Promise.all([
    db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.instructorId, instructor.id))
      .orderBy(courses.title),
    db
      .select({
        enrollmentId: enrollments.id,
        courseId: courses.id,
        courseTitle: courses.title,
        learnerEmail: users.email,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .leftJoin(users, eq(enrollments.userId, users.id))
      .where(eq(courses.instructorId, instructor.id))
      .orderBy(courses.title, users.email),
  ]);

  // Fetch all learners from Clerk
  const client = await clerkClient();
  const { data: clerkUsers } = await client.users.getUserList({ limit: 500 });
  const learners = clerkUsers
    .filter((u) => (u.publicMetadata?.role as Role) === "learner")
    .map((u) => ({ id: u.id, email: u.primaryEmailAddress?.emailAddress ?? "" }))
    .filter((u) => u.email)
    .sort((a, b) => a.email.localeCompare(b.email));

  const enrollmentMap = myCourses.map((course) => ({
    ...course,
    enrollments: currentEnrollments.filter((row) => row.courseId === course.id && row.learnerEmail),
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Instructor</p>
        <h1 className="text-3xl font-semibold text-foreground">Enroll</h1>
        <p className="text-sm text-muted-foreground">
          Enroll learners into your courses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enroll learner</CardTitle>
          <CardDescription>
            Select one of your courses and a registered learner to enroll.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no courses yet.</p>
          ) : learners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No learners are registered yet.</p>
          ) : (
            <form action={instructorEnrollLearnerAction} className="space-y-4 text-sm">
              <div className="space-y-1">
                <Label htmlFor="course-select">Course</Label>
                <select
                  id="course-select"
                  name="courseId"
                  required
                  defaultValue=""
                  className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                >
                  <option value="" disabled>Select a course</option>
                  {myCourses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="learner-select">Learner</Label>
                <select
                  id="learner-select"
                  name="email"
                  required
                  defaultValue=""
                  className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                >
                  <option value="" disabled>Select a learner</option>
                  {learners.map((learner) => (
                    <option key={learner.id} value={learner.email}>{learner.email}</option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full">Enroll learner</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current enrollments</CardTitle>
          <CardDescription>Expand a course to view and manage enrolled learners.</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollmentMap.every((c) => c.enrollments.length === 0) ? (
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
                      {course.enrollments.length} enrolled
                    </span>
                  </summary>
                  {course.enrollments.length === 0 ? (
                    <div className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
                      No learners enrolled.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border border-t border-border/70">
                      {course.enrollments.map((row) => (
                        <li key={row.enrollmentId} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span>{row.learnerEmail}</span>
                          <form action={unenrollLearnerAction}>
                            <input type="hidden" name="enrollmentId" value={row.enrollmentId!} />
                            <button
                              type="submit"
                              className="text-xs text-destructive hover:underline"
                            >
                              Remove
                            </button>
                          </form>
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
