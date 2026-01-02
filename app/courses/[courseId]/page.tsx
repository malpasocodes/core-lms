import { notFound, redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  contentItems,
  enrollments,
  modules,
  users,
  completions,
  assignments,
  submissions,
} from "@/lib/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { enrollLearnerAction } from "@/lib/enrollment-actions";
import { createContentItemAction, createModuleAction } from "@/lib/module-actions";
import { createAssignmentAction } from "@/lib/assignment-actions";

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

  let isEnrolled = false;
  if (user?.role === "learner") {
    const enrollment = await db.query.enrollments.findFirst({
      columns: { id: true },
      where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
    });
    isEnrolled = Boolean(enrollment);
  }

  const canView = isAdmin || isOwner || isEnrolled;
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
  const totalItems = itemRows.length;

  const assignmentRows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      createdAt: assignments.createdAt,
    })
    .from(assignments)
    .where(eq(assignments.courseId, courseId))
    .orderBy(assignments.createdAt);

  const learnerSubmissionSet =
    user.role === "learner" && assignmentRows.length
      ? new Set(
          (
            await db
              .select({ assignmentId: submissions.assignmentId })
              .from(submissions)
              .where(
                and(
                  eq(submissions.userId, user.id),
                  inArray(
                    submissions.assignmentId,
                    assignmentRows.map((a) => a.id)
                  )
                )
              )
          ).map((row) => row.assignmentId)
        )
      : new Set<string>();

  const submissionCounts =
    (isAdmin || isOwner) && assignmentRows.length
      ? await db
          .select({
            assignmentId: submissions.assignmentId,
            count: sql<number>`count(*)`,
          })
          .from(submissions)
          .where(inArray(submissions.assignmentId, assignmentRows.map((a) => a.id)))
          .groupBy(submissions.assignmentId)
      : [];
  const submissionCountMap = new Map<string, number>(
    submissionCounts.map((s) => [s.assignmentId, Number(s.count || 0)])
  );

  const learnerCompletionSet =
    user.role === "learner" && itemRows.length
      ? new Set(
          (
            await db
              .select({ contentItemId: completions.contentItemId })
              .from(completions)
              .where(
                and(
                  eq(completions.userId, user.id),
                  inArray(completions.contentItemId, itemRows.map((i) => i.id))
                )
              )
          ).map((c) => c.contentItemId)
        )
      : new Set<string>();

  const completionByUser =
    (isAdmin || isOwner) && itemRows.length
      ? await db
          .select({
            userId: completions.userId,
            count: sql<number>`count(*)`,
          })
          .from(completions)
          .where(inArray(completions.contentItemId, itemRows.map((i) => i.id)))
          .groupBy(completions.userId)
      : [];
  const completionMap = new Map<string, number>(completionByUser.map((c) => [c.userId, Number(c.count || 0)]));

  const enrolledLearners =
    (isAdmin || isOwner) &&
    (await db
      .select({
        email: users.email,
        id: users.id,
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
              moduleRows.map((mod) => {
                const items = itemsByModule[mod.id] || [];
                const completedCount =
                  user.role === "learner"
                    ? items.filter((item) => learnerCompletionSet.has(item.id)).length
                    : undefined;
                return (
                  <div key={mod.id} className="space-y-2 rounded-lg border border-border/70 bg-card/70 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                        <p className="text-xs text-muted-foreground">Order: {mod.order}</p>
                      </div>
                      {typeof completedCount === "number" ? (
                        <span className="text-xs font-semibold text-foreground">
                          {completedCount}/{items.length} completed
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {items.length ? (
                        <ul className="space-y-1 text-sm">
                          {items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between">
                              <a className="text-foreground underline" href={`/courses/${courseId}/items/${item.id}`}>
                                {item.title}
                              </a>
                              <div className="flex items-center gap-2">
                                {user.role === "learner" && learnerCompletionSet.has(item.id) ? (
                                  <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                                    ✓
                                  </span>
                                ) : null}
                                <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.type}</span>
                              </div>
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
                            <Label htmlFor={`title-${mod.id}`}>Item title</Label>
                            <Input id={`title-${mod.id}`} name="title" required />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`type-${mod.id}`}>Type</Label>
                            <select
                              id={`type-${mod.id}`}
                              name="type"
                              className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                              defaultValue="page"
                            >
                              <option value="page">Text page</option>
                              <option value="link">External link</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`content-${mod.id}`}>Content (text or URL)</Label>
                            <Textarea id={`content-${mod.id}`} name="content" rows={3} required />
                          </div>
                          <Button type="submit" className="w-full">Add content item</Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>
            Instructors create prompts; enrolled learners submit once. No grading logic in this phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignmentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <div className="space-y-2">
              {assignmentRows.map((assignment) => {
                const learnerSubmitted = learnerSubmissionSet.has(assignment.id);
                const submissionCount = submissionCountMap.get(assignment.id) || 0;
                return (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between rounded-lg border border-border/70 bg-card/70 p-3"
                  >
                    <div className="space-y-1">
                      <a
                        className="text-sm font-semibold text-foreground underline"
                        href={`/courses/${courseId}/assignments/${assignment.id}`}
                      >
                        {assignment.title}
                      </a>
                      {assignment.description ? (
                        <p className="text-xs text-muted-foreground">{assignment.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {user.role === "learner" ? (
                        <span className={learnerSubmitted ? "text-foreground" : undefined}>
                          {learnerSubmitted ? "Submitted" : "Not submitted"}
                        </span>
                      ) : null}
                      {isAdmin || isOwner ? <span>{submissionCount} submissions</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canEdit ? (
            <form
              action={createAssignmentAction}
              className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3"
            >
              <input type="hidden" name="courseId" value={courseId} />
              <div className="space-y-1">
                <Label htmlFor="assignment-title">Assignment title</Label>
                <Input id="assignment-title" name="title" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="assignment-description">Description / prompt</Label>
                <Textarea id="assignment-description" name="description" rows={3} />
              </div>
              <Button type="submit" className="w-full">Create assignment</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="rounded-2xl border border-border/80 bg-background/80 px-6 py-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Create module</h2>
          <p className="text-sm text-muted-foreground">Modules are ordered automatically and belong to this course.</p>
          <form action={createModuleAction} className="space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <div className="space-y-1">
              <Label htmlFor="module-title">Module title</Label>
              <Input id="module-title" name="title" required />
            </div>
            <Button type="submit">Add module</Button>
          </form>
        </div>
      ) : null}

      {canEdit ? (
        <div className="rounded-2xl border border-border/80 bg-background/80 px-6 py-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Completion summary</h2>
          <p className="text-sm text-muted-foreground">Read-only view of enrolled learners and their completion counts.</p>
          {enrolledLearners && enrolledLearners.length ? (
            <div className="divide-y divide-border rounded-md border border-border/60 bg-card/80 text-sm">
              {enrolledLearners.map((learner) => {
                const completed = completionMap.get(learner.id ?? "") || 0;
                return (
                  <div key={learner.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-foreground">{learner.email}</span>
                    <span className="text-xs font-semibold text-foreground">
                      {completed}/{totalItems || 0}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No enrolled learners yet.</p>
          )}
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
                  <Label htmlFor="email">Learner email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <Button type="submit">Enroll learner</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
