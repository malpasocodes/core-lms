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
  activities,
  modules,
  sections,
  completions,
  assessments,
  submissions,
  announcements,
  users,
  openstaxBooks,
  openstaxChapters,
  openstaxSections,
} from "@/lib/schema";
import { and, asc, desc, eq, inArray, like, sql } from "drizzle-orm";
import {
  createModuleAction,
  createSectionAction,
  createWatchActivityAction,
  uploadListenActivityAction,
  createReadActivityAction,
  createWriteActivityAction,
} from "@/lib/module-actions";
import { createAnnouncementAction, deleteAnnouncementAction } from "@/lib/announcement-actions";
import {
  importOpenstaxBookToCourseAction,
  importOpenstaxSectionAsReadActivityAction,
} from "@/lib/openstax-actions";
import { CourseTabs } from "./_components/course-tabs";
import { DeleteActivityButton } from "./_components/delete-activity-button";
import { getCourseJourney } from "@/lib/journey";
import { ModuleCard } from "@/components/journey/module-card";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ tab?: string; notice?: string; error?: string }>;
};

export default async function CourseDetailPage(props: CoursePageProps) {
  const { courseId } = (await props.params) || {};
  const { tab = "overview", notice, error } = (await props.searchParams) || {};

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

  // Learners get the Journey view; instructors/admins keep the curriculum/edit view below.
  if (user.role === "learner") {
    const journey = await getCourseJourney(courseId, user.id);
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Course
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-sm text-slate-600">{course.description}</p>
          )}
          {journey.totalActivities > 0 && (
            <p className="text-xs text-slate-500">
              {journey.completedActivities} of {journey.totalActivities} activities complete
            </p>
          )}
        </div>

        {notice && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {journey.modules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Your instructor hasn&apos;t added any modules yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {journey.modules.map((m) => (
              <ModuleCard key={m.id} module={m} />
            ))}
          </div>
        )}
      </div>
    );
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
            sourceRef: sections.sourceRef,
          })
          .from(sections)
          .where(inArray(sections.moduleId, moduleIds))
          .orderBy(sections.order)
      : [];

  const sectionIds = sectionRows.map((s) => s.id);

  const activityRows =
    sectionIds.length > 0
      ? await db
          .select({
            id: activities.id,
            sectionId: activities.sectionId,
            title: activities.title,
            type: activities.type,
            order: activities.order,
          })
          .from(activities)
          .where(inArray(activities.sectionId, sectionIds))
          .orderBy(activities.order)
      : [];

  const sectionsByModule = moduleIds.reduce<Record<string, typeof sectionRows>>((acc, id) => {
    acc[id] = sectionRows.filter((s) => s.moduleId === id);
    return acc;
  }, {});

  const activitiesBySection = sectionIds.reduce<Record<string, typeof activityRows>>((acc, id) => {
    acc[id] = activityRows.filter((a) => a.sectionId === id);
    return acc;
  }, {});

  const activityIds = activityRows.map((a) => a.id);

  const assessmentRows =
    activityIds.length > 0
      ? await db
          .select({
            id: assessments.id,
            activityId: assessments.activityId,
            title: assessments.title,
            description: assessments.description,
            type: assessments.type,
            graded: assessments.graded,
            dueAt: assessments.dueAt,
            order: assessments.order,
          })
          .from(assessments)
          .where(inArray(assessments.activityId, activityIds))
          .orderBy(asc(assessments.order))
      : [];

  // For each Write activity, the first open_ended assessment by order is the
  // built-in submission target — hide it from listings.
  const builtInWriteAssessmentIds = new Set<string>();
  for (const activity of activityRows) {
    if (activity.type !== "write") continue;
    const builtIn = assessmentRows
      .filter((a) => a.activityId === activity.id && a.type === "open_ended")
      .sort((a, b) => a.order - b.order)[0];
    if (builtIn) builtInWriteAssessmentIds.add(builtIn.id);
  }

  const visibleAssessments = assessmentRows.filter((a) => !builtInWriteAssessmentIds.has(a.id));

  // Learners are handled in the early-return branch above; instructor/admin code below.
  const submissionCounts =
    canEdit && visibleAssessments.length
      ? await db
          .select({
            assessmentId: submissions.assessmentId,
            count: sql<number>`count(*)`,
          })
          .from(submissions)
          .where(inArray(submissions.assessmentId, visibleAssessments.map((a) => a.id)))
          .groupBy(submissions.assessmentId)
      : [];
  const submissionCountMap = new Map<string, number>(
    submissionCounts.map((s) => [s.assessmentId, Number(s.count || 0)])
  );


  // Lookup helpers for display
  const sectionTitleById = Object.fromEntries(sectionRows.map((s) => [s.id, s.title]));
  const activityById = new Map(activityRows.map((a) => [a.id, a]));

  // Announcements (newest first, with author email)
  const announcementRows = await db
    .select({
      id: announcements.id,
      body: announcements.body,
      createdAt: announcements.createdAt,
      authorEmail: users.email,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.authorId, users.id))
    .where(eq(announcements.courseId, courseId))
    .orderBy(desc(announcements.createdAt));

  // OpenStax catalog for the Import tab (instructors/admins only)
  const importCatalog =
    canEdit && tab === "import"
      ? await db
          .select({
            id: openstaxBooks.id,
            title: openstaxBooks.title,
            subject: openstaxBooks.subject,
            chapterCount: sql<number>`count(distinct ${openstaxChapters.id})`,
            sectionCount: sql<number>`count(${openstaxSections.id})`,
          })
          .from(openstaxBooks)
          .leftJoin(openstaxChapters, eq(openstaxChapters.bookId, openstaxBooks.id))
          .leftJoin(openstaxSections, eq(openstaxSections.chapterId, openstaxChapters.id))
          .groupBy(openstaxBooks.id, openstaxBooks.title, openstaxBooks.subject)
          .orderBy(openstaxBooks.title)
      : [];

  const importedBookIds =
    canEdit && tab === "import"
      ? new Set(
          (
            await db
              .select({ sourceRef: modules.sourceRef })
              .from(modules)
              .where(
                and(
                  eq(modules.courseId, courseId),
                  like(modules.sourceRef, "openstax:book:%"),
                ),
              )
          )
            .map((r) => r.sourceRef?.match(/^openstax:book:([^:]+):/)?.[1])
            .filter((id): id is string => Boolean(id))
        )
      : new Set<string>();

  // Per-module activity totals (instructor/admin view; progress columns are learner-only)
  const moduleProgressMap = new Map(
    moduleRows.map((mod) => {
      const modActivities = (sectionsByModule[mod.id] ?? []).flatMap((s) => activitiesBySection[s.id] ?? []);
      return [mod.id, { total: modActivities.length, completed: 0 }];
    })
  );

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

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          {notice}
        </div>
      )}

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
                <ul className="space-y-3">
                  {moduleRows.map((mod) => {
                    const modSections = sectionsByModule[mod.id] || [];
                    const sectionCount = modSections.length;
                    const activityCount = modSections.reduce(
                      (sum, s) => sum + (activitiesBySection[s.id]?.length ?? 0),
                      0
                    );
                    const prog = moduleProgressMap.get(mod.id);
                    return (
                      <li key={mod.id} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-foreground">{mod.title}</span>
                          <span className="text-muted-foreground">
                            {sectionCount} {sectionCount === 1 ? "section" : "sections"}, {activityCount} {activityCount === 1 ? "activity" : "activities"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessments</CardTitle>
              <CardDescription>
                {visibleAssessments.length} {visibleAssessments.length === 1 ? "assessment" : "assessments"} attached to activities
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {visibleAssessments.length === 0 ? (
                <p>No assessments yet.</p>
              ) : (
                <ul className="space-y-1">
                  {visibleAssessments.map((a) => {
                    const activity = activityById.get(a.activityId);
                    return (
                      <li key={a.id}>
                        <a
                          href={`/courses/${courseId}/activities/${a.activityId}/assessments/${a.id}`}
                          className="text-foreground underline"
                        >
                          {a.title}
                        </a>
                        {activity && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            — {activity.title}
                          </span>
                        )}
                      </li>
                    );
                  })}
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
                const prog = moduleProgressMap.get(mod.id);
                return (
                  <Card key={mod.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-1.5">
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
                            const items = activitiesBySection[sec.id] || [];
                            return (
                              <div
                                key={sec.id}
                                className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-foreground">{sec.title}</p>
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
                                          href={`/courses/${courseId}/activities/${item.id}`}
                                        >
                                          {item.title}
                                        </a>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                            {item.type}
                                          </span>
                                          {canEdit && (
                                            <DeleteActivityButton
                                              activityId={item.id}
                                              activityTitle={item.title}
                                              activityType={item.type}
                                            />
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No activities yet.</p>
                                )}

                                {canEdit && (
                                  <div className="space-y-1">
                                    {/* Watch */}
                                    <details className="group rounded border border-border/40 bg-background/40">
                                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground select-none">
                                        + Watch — YouTube video
                                      </summary>
                                      <form
                                        action={createWatchActivityAction}
                                        className="space-y-2 border-t border-border/40 p-3"
                                      >
                                        <input type="hidden" name="sectionId" value={sec.id} />
                                        <div className="space-y-1">
                                          <Label htmlFor={`watch-title-${sec.id}`}>Title</Label>
                                          <Input id={`watch-title-${sec.id}`} name="title" required />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`watch-url-${sec.id}`}>YouTube URL</Label>
                                          <Input
                                            id={`watch-url-${sec.id}`}
                                            name="youtubeUrl"
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            required
                                          />
                                        </div>
                                        <Button type="submit" size="sm">Add Watch activity</Button>
                                      </form>
                                    </details>

                                    {/* Listen */}
                                    <details className="group rounded border border-border/40 bg-background/40">
                                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground select-none">
                                        + Listen — audio file
                                      </summary>
                                      <form
                                        action={uploadListenActivityAction}
                                        encType="multipart/form-data"
                                        className="space-y-2 border-t border-border/40 p-3"
                                      >
                                        <input type="hidden" name="sectionId" value={sec.id} />
                                        <div className="space-y-1">
                                          <Label htmlFor={`listen-title-${sec.id}`}>Title</Label>
                                          <Input id={`listen-title-${sec.id}`} name="title" required />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`listen-file-${sec.id}`}>Audio file (MP3, M4A, WAV, OGG — max 100 MB)</Label>
                                          <Input
                                            id={`listen-file-${sec.id}`}
                                            name="file"
                                            type="file"
                                            accept="audio/*"
                                            required
                                          />
                                        </div>
                                        <Button type="submit" size="sm">Upload Listen activity</Button>
                                      </form>
                                    </details>

                                    {/* Read */}
                                    <details className="group rounded border border-border/40 bg-background/40">
                                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground select-none">
                                        + Read — PDF or Markdown
                                      </summary>
                                      <form
                                        action={createReadActivityAction}
                                        encType="multipart/form-data"
                                        className="space-y-2 border-t border-border/40 p-3"
                                      >
                                        <input type="hidden" name="sectionId" value={sec.id} />
                                        <div className="space-y-1">
                                          <Label htmlFor={`read-title-${sec.id}`}>Title</Label>
                                          <Input id={`read-title-${sec.id}`} name="title" required />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`read-file-${sec.id}`}>File (.pdf or .md — max 20 MB)</Label>
                                          <Input
                                            id={`read-file-${sec.id}`}
                                            name="file"
                                            type="file"
                                            accept=".pdf,.md,.markdown,application/pdf,text/markdown"
                                            required
                                          />
                                        </div>
                                        <Button type="submit" size="sm">Upload Read activity</Button>
                                      </form>
                                    </details>

                                    {/* Import Read — from OpenStax (only when section is linked) */}
                                    {sec.sourceRef?.startsWith("openstax:book:") && (
                                      <details className="group rounded border border-border/40 bg-background/40">
                                        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground select-none">
                                          + Import Read — from OpenStax
                                        </summary>
                                        <form
                                          action={importOpenstaxSectionAsReadActivityAction}
                                          className="space-y-2 border-t border-border/40 p-3"
                                        >
                                          <input type="hidden" name="sectionId" value={sec.id} />
                                          <p className="text-xs text-muted-foreground">
                                            Imports the OpenStax section text linked to this section as a Read activity.
                                          </p>
                                          <div className="space-y-1">
                                            <Label htmlFor={`import-read-title-${sec.id}`}>Title (optional — defaults to OpenStax section title)</Label>
                                            <Input id={`import-read-title-${sec.id}`} name="title" placeholder="Leave blank to use OpenStax title" />
                                          </div>
                                          <Button type="submit" size="sm">Import Read activity</Button>
                                        </form>
                                      </details>
                                    )}

                                    {/* Write */}
                                    <details className="group rounded border border-border/40 bg-background/40">
                                      <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground select-none">
                                        + Write — writing prompt
                                      </summary>
                                      <form
                                        action={createWriteActivityAction}
                                        className="space-y-2 border-t border-border/40 p-3"
                                      >
                                        <input type="hidden" name="sectionId" value={sec.id} />
                                        <div className="space-y-1">
                                          <Label htmlFor={`write-title-${sec.id}`}>Title</Label>
                                          <Input id={`write-title-${sec.id}`} name="title" required />
                                        </div>
                                        <div className="space-y-1">
                                          <Label htmlFor={`write-prompt-${sec.id}`}>Prompt</Label>
                                          <Textarea id={`write-prompt-${sec.id}`} name="prompt" rows={4} required />
                                        </div>
                                        <div className="flex gap-3">
                                          <div className="flex-1 space-y-1">
                                            <Label htmlFor={`write-min-${sec.id}`}>Min characters (optional)</Label>
                                            <Input id={`write-min-${sec.id}`} name="minChars" type="number" min="0" placeholder="e.g. 100" />
                                          </div>
                                          <div className="flex-1 space-y-1">
                                            <Label htmlFor={`write-max-${sec.id}`}>Max characters (optional)</Label>
                                            <Input id={`write-max-${sec.id}`} name="maxChars" type="number" min="0" placeholder="e.g. 2000" />
                                          </div>
                                        </div>
                                        <Button type="submit" size="sm">Add Write activity</Button>
                                      </form>
                                    </details>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {canEdit && (
                        <details className="rounded-md border border-border/60 bg-muted/30">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground select-none">
                            + Add section
                          </summary>
                          <form
                            action={createSectionAction}
                            className="border-t border-border/60 p-3"
                          >
                            <input type="hidden" name="moduleId" value={mod.id} />
                            <div className="flex gap-2">
                              <Input name="title" placeholder="Section title" required className="h-8 text-sm" />
                              <Button type="submit" size="sm">Add</Button>
                            </div>
                          </form>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "assessments" && (
        <div className="space-y-4">
          {visibleAssessments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No assessments yet. Add an assessment from any activity page.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleAssessments.map((a) => {
                const submissionCount = submissionCountMap.get(a.id) || 0;
                const activity = activityById.get(a.activityId);
                return (
                  <Card key={a.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="space-y-1">
                        <a
                          className="text-sm font-semibold text-foreground underline"
                          href={`/courses/${courseId}/activities/${a.activityId}/assessments/${a.id}`}
                        >
                          {a.title}
                        </a>
                        {a.description && (
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        )}
                        {activity && (
                          <p className="text-[11px] text-muted-foreground">
                            Activity: {activity.title}
                            {activity.sectionId && sectionTitleById[activity.sectionId]
                              ? ` — ${sectionTitleById[activity.sectionId]}`
                              : ""}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {a.type === "mcq" ? "Multiple choice" : "Open-ended"}
                          {a.graded ? " • Graded" : " • Formative"}
                        </p>
                        {a.dueAt && (
                          <p className={`text-[11px] font-medium ${a.dueAt < new Date() ? "text-red-600" : "text-muted-foreground"}`}>
                            Due: {a.dueAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {a.dueAt < new Date() ? " — Overdue" : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {canEdit && <span>{submissionCount} submissions</span>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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

      {tab === "announcements" && (
        <div className="space-y-4">
          {/* Feed */}
          {announcementRows.length === 0 ? (
            <p className="text-sm text-slate-400">No announcements yet.</p>
          ) : (
            <div className="space-y-3">
              {announcementRows.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap flex-1">{a.body}</p>
                    {canEdit && (
                      <form action={deleteAnnouncementAction}>
                        <input type="hidden" name="courseId" value={courseId} />
                        <input type="hidden" name="announcementId" value={a.id} />
                        <button
                          type="submit"
                          className="text-xs text-slate-400 hover:text-red-600 transition-colors shrink-0"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {a.authorEmail} ·{" "}
                    {a.createdAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Compose form — instructor / admin only */}
          {canEdit && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Post announcement</h2>
              <form action={createAnnouncementAction} className="space-y-3">
                <input type="hidden" name="courseId" value={courseId} />
                <Textarea
                  name="body"
                  rows={3}
                  placeholder="Write a message to all enrolled learners…"
                  required
                />
                <Button type="submit" size="sm">Post</Button>
              </form>
            </div>
          )}
        </div>
      )}

      {tab === "import" && canEdit && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import from OpenStax</CardTitle>
              <CardDescription>
                Copy chapters and sections from an ingested textbook into this course.
                Chapters become modules, sections become module sections. Content is not
                copied — you fill activities in yourself.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importCatalog.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No ingested OpenStax books yet. Ask an admin to ingest books from{" "}
                  <a href="/admin/openstax" className="underline">
                    /admin/openstax
                  </a>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {importCatalog.map((book) => {
                    const already = importedBookIds.has(book.id);
                    return (
                      <li
                        key={book.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">{book.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {Number(book.chapterCount)} chapters · {Number(book.sectionCount)} sections
                            {book.subject ? ` · ${book.subject}` : ""}
                          </p>
                        </div>
                        {already ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Already imported
                          </span>
                        ) : (
                          <form action={importOpenstaxBookToCourseAction}>
                            <input type="hidden" name="courseId" value={courseId} />
                            <input type="hidden" name="bookId" value={book.id} />
                            <Button type="submit" size="sm" variant="outline">
                              Import
                            </Button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
