import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { enrollLearnerAction } from "@/lib/enrollment-actions";

export default async function AdminEnrollPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const db = await getDb();
  const [courseList, learners] = await Promise.all([
    db.select({ id: courses.id, title: courses.title }).from(courses).orderBy(courses.createdAt),
    db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "learner")),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold text-foreground">Enroll</h1>
        <p className="text-sm text-muted-foreground">
          Enroll an existing learner into an existing course.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-5">
        <form action={enrollLearnerAction} className="space-y-4 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground" htmlFor="course-select">
              Course
            </label>
            <select
              id="course-select"
              name="courseId"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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
            <label className="text-xs font-semibold text-foreground" htmlFor="learner-email">
              Learner
            </label>
            <select
              id="learner-email"
              name="email"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
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

          <button
            type="submit"
            className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Enroll learner
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          This form only enrolls existing learners into existing courses. Use Roster to create users first.
        </p>
      </div>
    </div>
  );
}
