import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  contentItems,
  modules,
  sections,
  completions,
  assignments,
  submissions,
} from "@/lib/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createContentItemAction, createModuleAction, createSectionAction, uploadPdfContentItemAction } from "@/lib/module-actions";
import { createAssignmentAction } from "@/lib/assignment-actions";
import { CourseTabs } from "./_components/course-tabs";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CourseDetailPage(props: CoursePageProps) {
  const { courseId } = (await props.params) || {};
  const { tab = "overview" } = (await props.searchParams) || {};

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
    redirect("/sign-in");
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

  const sectionRows =
    moduleIds.length > 0
      ? await db
          .select({
            id: sections.id,
            moduleId: sections.moduleId,
            title: sections.title,
            order: sections.order,
          })
          .from(sections)
          .where(inArray(sections.moduleId, moduleIds))
          .orderBy(sections.order)
      : [];

  const sectionIds = sectionRows.map((s) => s.id);

  const itemRows =
    sectionIds.length > 0
      ? await db
          .select({
            id: contentItems.id,
            sectionId: contentItems.sectionId,
            title: contentItems.title,
            type: contentItems.type,
            order: contentItems.order,
          })
          .from(contentItems)
          .where(inArray(contentItems.sectionId, sectionIds))
          .orderBy(contentItems.order)
      : [];

  const sectionsByModule = moduleIds.reduce<Record<string, typeof sectionRows>>((acc, id) => {
    acc[id] = sectionRows.filter((s) => s.moduleId === id);
    return acc;
  }, {});

  const itemsBySection = sectionIds.reduce<Record<string, typeof itemRows>>((acc, id) => {
    acc[id] = itemRows.filter((item) => item.sectionId === id);
    return acc;
  }, {});

  const assignmentRows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      sectionId: assignments.sectionId,
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

  // Build a lookup from sectionId → section title for assignment display
  const sectionTitleById = Object.fromEntries(sectionRows.map((s) => [s.id, s.title]));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {course.description || "No description provided."}
          </p>
        </div>
        <Suspense fallback={<div className="h-9" />}>
          <CourseTabs courseId={courseId} canEdit={canEdit} />
        </Suspense>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>{moduleRows.length} modules in this course</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {moduleRows.length === 0 ? (
                <p>No modules yet.</p>
              ) : (
                <ul className="space-y-1">
                  {moduleRows.map((mod) => {
                    const modSections = sectionsByModule[mod.id] || [];
                    const sectionCount = modSections.length;
                    const itemCount = modSections.reduce(
                      (sum, s) => sum + (itemsBySection[s.id]?.length ?? 0),
                      0
                    );
                    return (
                      <li key={mod.id} className="flex justify-between">
                        <span className="text-foreground">{mod.title}</span>
                        <span className="text-muted-foreground">
                          {sectionCount} {sectionCount === 1 ? "section" : "sections"}, {itemCount} items
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>{assignmentRows.length} assignments in this course</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {assignmentRows.length === 0 ? (
                <p>No assignments yet.</p>
              ) : (
                <ul className="space-y-1">
                  {assignmentRows.map((assignment) => (
                    <li key={assignment.id}>
                      <a
                        href={`/courses/${courseId}/assignments/${assignment.id}`}
                        className="text-foreground underline"
                      >
                        {assignment.title}
                      </a>
                      {assignment.sectionId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          — {sectionTitleById[assignment.sectionId] ?? ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "modules" && (
        <div className="space-y-4">
          {moduleRows.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No modules yet. Create your first module to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {moduleRows.map((mod) => {
                const modSections = sectionsByModule[mod.id] || [];
                return (
                  <Card key={mod.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{mod.title}</CardTitle>
                          <CardDescription>Order: {mod.order}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {modSections.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No sections yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {modSections.map((sec) => {
                            const items = itemsBySection[sec.id] || [];
                            const completedCount =
                              user.role === "learner"
                                ? items.filter((item) => learnerCompletionSet.has(item.id)).length
                                : undefined;
                            return (
                              <div
                                key={sec.id}
                                className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-foreground">{sec.title}</p>
                                  {typeof completedCount === "number" && (
                                    <span className="text-xs font-semibold text-foreground">
                                      {completedCount}/{items.length} completed
                                    </span>
                                  )}
                                </div>
                                {items.length > 0 ? (
                                  <ul className="space-y-1 text-sm">
                                    {items.map((item) => (
                                      <li
                                        key={item.id}
                                        className="flex items-center justify-between rounded border border-border/40 bg-background/60 px-3 py-1.5"
                                      >
                                        <a
                                          className="text-foreground underline"
                                          href={`/courses/${courseId}/items/${item.id}`}
                                        >
                                          {item.title}
                                        </a>
                                        <div className="flex items-center gap-2">
                                          {user.role === "learner" && learnerCompletionSet.has(item.id) && (
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                                              ✓
                                            </span>
                                          )}
                                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                            {item.type}
                                          </span>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No content items yet.</p>
                                )}

                                {canEdit && (
                                  <div className="space-y-2">
                                    <form
                                      action={createContentItemAction}
                                      className="space-y-2 rounded border border-border/40 bg-background/40 p-3"
                                    >
                                      <p className="text-xs font-medium text-foreground">Add content item</p>
                                      <input type="hidden" name="sectionId" value={sec.id} />
                                      <div className="space-y-1">
                                        <Label htmlFor={`title-${sec.id}`}>Item title</Label>
                                        <Input id={`title-${sec.id}`} name="title" required />
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor={`type-${sec.id}`}>Type</Label>
                                        <select
                                          id={`type-${sec.id}`}
                                          name="type"
                                          className="flex h-9 w-full rounded-md border border-input bg-input/20 px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                                          defaultValue="page"
                                        >
                                          <option value="page">Text page</option>
                                          <option value="link">External link</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor={`content-${sec.id}`}>Content (text or URL)</Label>
                                        <Textarea id={`content-${sec.id}`} name="content" rows={2} required />
                                      </div>
                                      <Button type="submit" size="sm">Add content item</Button>
                                    </form>

                                    <form
                                      action={uploadPdfContentItemAction}
                                      encType="multipart/form-data"
                                      className="space-y-2 rounded border border-border/40 bg-background/40 p-3"
                                    >
                                      <p className="text-xs font-medium text-foreground">Upload PDF</p>
                                      <input type="hidden" name="sectionId" value={sec.id} />
                                      <div className="space-y-1">
                                        <Label htmlFor={`pdf-title-${sec.id}`}>PDF title</Label>
                                        <Input id={`pdf-title-${sec.id}`} name="title" required />
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor={`pdf-file-${sec.id}`}>File</Label>
                                        <Input
                                          id={`pdf-file-${sec.id}`}
                                          name="file"
                                          type="file"
                                          accept="application/pdf"
                                          required
                                        />
                                      </div>
                                      <Button type="submit" size="sm">Upload PDF</Button>
                                    </form>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {canEdit && (
                        <form
                          action={createSectionAction}
                          className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3"
                        >
                          <p className="text-xs font-medium text-foreground">Add section</p>
                          <input type="hidden" name="moduleId" value={mod.id} />
                          <div className="flex gap-2">
                            <Input name="title" placeholder="Section title" required className="h-8 text-sm" />
                            <Button type="submit" size="sm">Add</Button>
                          </div>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "assignments" && (
        <div className="space-y-4">
          {assignmentRows.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No assignments yet.{canEdit ? " Create your first assignment below." : ""}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {assignmentRows.map((assignment) => {
                const learnerSubmitted = learnerSubmissionSet.has(assignment.id);
                const submissionCount = submissionCountMap.get(assignment.id) || 0;
                return (
                  <Card key={assignment.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="space-y-1">
                        <a
                          className="text-sm font-semibold text-foreground underline"
                          href={`/courses/${courseId}/assignments/${assignment.id}`}
                        >
                          {assignment.title}
                        </a>
                        {assignment.description && (
                          <p className="text-xs text-muted-foreground">{assignment.description}</p>
                        )}
                        {assignment.sectionId && (
                          <p className="text-[11px] text-muted-foreground">
                            Section: {sectionTitleById[assignment.sectionId] ?? ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {user.role === "learner" && (
                          <span className={learnerSubmitted ? "text-foreground" : undefined}>
                            {learnerSubmitted ? "Submitted" : "Not submitted"}
                          </span>
                        )}
                        {(isAdmin || isOwner) && <span>{submissionCount} submissions</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createAssignmentAction} className="space-y-3">
                  <input type="hidden" name="courseId" value={courseId} />
                  <div className="space-y-1">
                    <Label htmlFor="assignment-section">Section</Label>
                    <select
                      id="assignment-section"
                      name="sectionId"
                      className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                      defaultValue=""
                    >
                      <option value="">No section</option>
                      {moduleRows.map((mod) =>
                        (sectionsByModule[mod.id] || []).map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {mod.title} › {sec.title}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="assignment-title">Assignment title</Label>
                    <Input id="assignment-title" name="title" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="assignment-description">Description / prompt</Label>
                    <Textarea id="assignment-description" name="description" rows={3} />
                  </div>
                  <Button type="submit">Create assignment</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "create-module" && canEdit && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Module</CardTitle>
              <CardDescription>
                Modules are ordered automatically and belong to this course.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createModuleAction} className="space-y-4">
                <input type="hidden" name="courseId" value={courseId} />
                <div className="space-y-1">
                  <Label htmlFor="module-title">Module title</Label>
                  <Input id="module-title" name="title" required />
                </div>
                <Button type="submit">Add module</Button>
              </form>
            </CardContent>
          </Card>

          {moduleRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Existing Modules</CardTitle>
                <CardDescription>{moduleRows.length} modules in this course</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {moduleRows.map((mod) => (
                    <li key={mod.id} className="flex justify-between text-foreground">
                      <span>{mod.title}</span>
                      <span className="text-muted-foreground">
                        {(sectionsByModule[mod.id] || []).length} sections
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
