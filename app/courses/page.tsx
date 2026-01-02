import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { courses, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { CourseForm } from "@/app/dashboard/_components/course-form";
import { updateCourseAction } from "@/lib/course-actions";
import { DeleteCourseForm } from "./_components/delete-course-form";

function isInstructor(user: { role: string }) {
  return user.role === "instructor";
}

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground">Please log in to view courses.</p>
      </div>
    );
  }

  const db = await getDb();
  const isAdmin = user.role === "admin";

  const [courseList, instructors] = await Promise.all([
    isAdmin
      ? db.select({ id: courses.id, title: courses.title, instructorId: courses.instructorId }).from(courses)
      : db
          .select({ id: courses.id, title: courses.title, instructorId: courses.instructorId })
          .from(courses)
          .where(eq(courses.instructorId, user.id)),
    isAdmin
      ? db.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, "instructor"))
      : [],
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Courses</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Admins can create, edit, and delete courses. Instructors see only their assigned courses."
            : "Your assigned courses are listed below."}
        </p>
        {(isAdmin || isInstructor(user)) && (
          <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <Link
              href="/courses/modules"
              className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-background/70"
            >
              Modules
            </Link>
            <Link
              href="/courses/content"
              className="rounded-md border border-border px-3 py-1 text-foreground hover:bg-background/70"
            >
              Content
            </Link>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course list</CardTitle>
          <CardDescription>Assigned courses for your role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {courseList.length === 0 ? (
            <p>No courses available.</p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border/70 bg-card/70 text-foreground">
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
        </CardContent>
      </Card>

      {isAdmin ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Create a course</CardTitle>
              <CardDescription>Assign to an instructor on creation.</CardDescription>
            </CardHeader>
            <CardContent>
              <CourseForm instructors={instructors} />
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Edit a course</CardTitle>
              <CardDescription>Update title/description/instructor/published.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateCourseAction} className="space-y-3 text-sm">
                <div className="space-y-1">
                  <Label htmlFor="edit-course">Course</Label>
                  <select
                    id="edit-course"
                    name="courseId"
                    required
                    className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                  >
                    <option value="">Select course</option>
                    {courseList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input id="edit-title" name="title" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" name="description" rows={2} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-instructor">Instructor</Label>
                  <select
                    id="edit-instructor"
                    name="instructorId"
                    required
                    className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                  >
                    <option value="">Select instructor</option>
                    {instructors.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox id="edit-published" name="published" />
                  <Label htmlFor="edit-published" className="text-sm font-normal">
                    Published
                  </Label>
                </div>
                <Button type="submit" className="w-full">
                  Update course
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Delete a course</CardTitle>
              <CardDescription>Remove a course and its content.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteCourseForm courses={courseList} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
