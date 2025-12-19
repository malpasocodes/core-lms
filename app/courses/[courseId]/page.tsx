import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { contentItems, courses, enrollments, modules, users } from "@/lib/schema";
import { and, eq, inArray } from "drizzle-orm";
import { enrollLearnerAction } from "@/lib/enrollment-actions";
import { createContentItemAction, createModuleAction } from "@/lib/module-actions";

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

  if (!user) {
    redirect("/auth/login");
  }

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";

  if (user.role === "instructor" && !isOwner && !isAdmin) {
    redirect("/dashboard?error=Not%20authorized");
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

  const canEdit = isAdmin || isOwner;

  const moduleRows = await db
    .select({
      id: modules.id,
      title: modules.title,
      order: modules.order,
    })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.order);

  const moduleIds = moduleRows.map((m) => m.id);
  const itemRows =
    moduleIds.length > 0
      ? await db
          .select({
            id: contentItems.id,
            moduleId: contentItems.moduleId,
            title: contentItems.title,
            type: contentItems.type,
            order: contentItems.order,
          })
          .from(contentItems)
          .where(inArray(contentItems.moduleId, moduleIds))
          .orderBy(contentItems.order)
      : [];

  const itemsByModule = moduleIds.reduce<Record<string, typeof itemRows>>((acc, id) => {
    acc[id] = itemRows.filter((item) => item.moduleId === id);
    return acc;
  }, {});

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
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {moduleRows.length === 0 ? (
              <p>No modules yet.</p>
            ) : (
              moduleRows.map((mod) => (
                <div key={mod.id} className="space-y-2 rounded-lg border border-border/70 bg-card/70 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                      <p className="text-xs text-muted-foreground">Order: {mod.order}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {itemsByModule[mod.id]?.length ? (
                      <ul className="space-y-1 text-sm">
                        {itemsByModule[mod.id].map((item) => (
                          <li key={item.id} className="flex items-center justify-between">
                            <a className="text-foreground underline" href={`/courses/${courseId}/items/${item.id}`}>
                              {item.title}
                            </a>
                            <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.type}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground">No content items yet.</p>
                    )}
                    {canEdit ? (
                      <form action={createContentItemAction} className="space-y-2 rounded-md border border-border/60 bg-background/80 p-3">
                        <input type="hidden" name="moduleId" value={mod.id} />
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground" htmlFor={`title-${mod.id}`}>
                            Item title
                          </label>
                          <input
                            id={`title-${mod.id}`}
                            name="title"
                            required
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground" htmlFor={`type-${mod.id}`}>
                            Type
                          </label>
                          <select
                            id={`type-${mod.id}`}
                            name="type"
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                            defaultValue="page"
                          >
                            <option value="page">Text page</option>
                            <option value="link">External link</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground" htmlFor={`content-${mod.id}`}>
                            Content (text or URL)
                          </label>
                          <textarea
                            id={`content-${mod.id}`}
                            name="content"
                            rows={3}
                            required
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
                        >
                          Add content item
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit ? (
        <div className="rounded-2xl border border-border/80 bg-background/80 px-6 py-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Create module</h2>
          <p className="text-sm text-muted-foreground">Modules are ordered automatically and belong to this course.</p>
          <form action={createModuleAction} className="space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
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
              className="rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-background hover:bg-foreground/90"
            >
              Add module
            </button>
          </form>
        </div>
      ) : null}

      {canEdit ? (
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
