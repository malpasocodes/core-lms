import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDb, sql } from "@/lib/db";
import { courses, modules, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createModuleAction, updateModuleAction, deleteModuleAction } from "@/lib/module-actions";

export default async function ModulesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  const isAdmin = user.role === "admin";
  const isInstructor = user.role === "instructor";
  if (!isAdmin && !isInstructor) {
    redirect("/dashboard");
  }

  const db = await getDb();
  const [courseList, moduleList] = await Promise.all([
    isAdmin
      ? db
          .select({ id: courses.id, title: courses.title, instructorEmail: users.email })
          .from(courses)
          .leftJoin(users, eq(courses.instructorId, users.id))
          .orderBy(courses.createdAt)
      : db
          .select({ id: courses.id, title: courses.title })
          .from(courses)
          .where(eq(courses.instructorId, user.id))
          .orderBy(courses.createdAt),
    isAdmin
      ? db
          .select({
            id: modules.id,
            title: modules.title,
            order: modules.order,
            courseTitle: courses.title,
          })
          .from(modules)
          .leftJoin(courses, eq(modules.courseId, courses.id))
          .orderBy(courses.title, modules.order)
      : db
          .select({
            id: modules.id,
            title: modules.title,
            order: modules.order,
            courseTitle: courses.title,
          })
          .from(modules)
          .leftJoin(courses, eq(modules.courseId, courses.id))
          .where(eq(courses.instructorId, user.id))
          .orderBy(courses.title, modules.order),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Courses</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Modules</h1>
        <p className="text-sm text-muted-foreground">View and manage modules for your courses.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>View modules</CardTitle>
            <CardDescription>Modules grouped by course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            {moduleList.length === 0 ? (
              <p className="text-muted-foreground">No modules found.</p>
            ) : (
              <div className="divide-y divide-border rounded-md border border-border/70 bg-background/80">
                {moduleList.map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {mod.courseTitle} • Order {mod.order}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      #{mod.order}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create module</CardTitle>
            <CardDescription>Add a module to a course you own.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createModuleAction} className="space-y-3 text-sm">
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
                    Select course
                  </option>
                  {courseList.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="module-title">
                  Module title
                </label>
                <input
                  id="module-title"
                  name="title"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
              >
                Create module
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Edit module</CardTitle>
            <CardDescription>Update title and order.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateModuleAction} className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="edit-module">
                  Module
                </label>
                <select
                  id="edit-module"
                  name="moduleId"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select module
                  </option>
                  {moduleList.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.title} ({mod.courseTitle})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="edit-title">
                  New title
                </label>
                <input
                  id="edit-title"
                  name="title"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="edit-order">
                  Order (optional)
                </label>
                <input
                  id="edit-order"
                  name="order"
                  type="number"
                  min="1"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="Leave blank to keep current order"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
              >
                Update module
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delete module</CardTitle>
            <CardDescription>Removes the module and its content items.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteModuleAction} className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground" htmlFor="delete-module">
                  Module
                </label>
                <select
                  id="delete-module"
                  name="moduleId"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select module
                  </option>
                  {moduleList.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.title} ({mod.courseTitle})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-background hover:bg-destructive/90"
              >
                Delete module
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
