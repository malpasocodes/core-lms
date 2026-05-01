import { notFound, redirect } from "next/navigation";

import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { activities, assessments, courses, modules, sections, submissions, users } from "@/lib/schema";
import { markActivityCompleteAction } from "@/lib/progress-actions";
import { NormalizedContentRenderer } from "@/components/normalized-content-renderer";
import { MarkdownItemEditor } from "@/components/markdown-item-editor";
import { HtmlItemEditor } from "@/components/html-item-editor";
import { GenerateMcqButton } from "@/components/generate-mcq-button";
import { generateMcqFromPdfAction } from "@/lib/mcq-actions";
import { submitWriteActivityAction } from "@/lib/module-actions";
import { WriteActivityClient } from "@/components/write-activity-client";

type ActivityPageProps = {
  params: Promise<{ courseId: string; activityId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
};

const ACTIVITY_LABEL: Record<string, string> = {
  watch: "Watch",
  listen: "Listen",
  read: "Read",
  write: "Write",
};

export default async function ActivityPage(props: ActivityPageProps) {
  const { courseId, activityId } = (await props.params) || {};
  const { notice, error } = (await props.searchParams) || {};
  if (!courseId || !activityId) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const itemRow = await db
    .select({
      activityId: activities.id,
      activityTitle: activities.title,
      activityType: activities.type,
      activityContent: activities.content,
      activityPayload: activities.contentPayload,
      sectionId: sections.id,
      sectionTitle: sections.title,
      moduleTitle: modules.title,
      courseId: courses.id,
      instructorId: courses.instructorId,
    })
    .from(activities)
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(and(eq(activities.id, activityId), eq(courses.id, courseId)))
    .limit(1);

  const item = itemRow[0];
  if (!item) notFound();

  const isOwner = user.role === "instructor" && user.id === item.instructorId;
  const isAdmin = user.role === "admin";

  let isEnrolled = false;
  let isCompleted = false;
  if (user.role === "learner") {
    const enrollment = await db.query.enrollments.findFirst({
      columns: { id: true },
      where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
    });
    isEnrolled = Boolean(enrollment);
    if (enrollment) {
      const completion = await db.query.completions.findFirst({
        columns: { id: true },
        where: (c, { and, eq }) => and(eq(c.activityId, activityId), eq(c.userId, user.id)),
      });
      isCompleted = Boolean(completion);
    }
  }

  if (!(isAdmin || isOwner || isEnrolled)) {
    redirect("/dashboard?error=Not%20enrolled%20in%20this%20course");
  }

  const siblings =
    item.sectionId && typeof item.sectionId === "string"
      ? await db
          .select({ id: activities.id, title: activities.title })
          .from(activities)
          .where(eq(activities.sectionId, item.sectionId))
          .orderBy(activities.order)
      : [];

  const idx = siblings.findIndex((s) => s.id === activityId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const payload = item.activityPayload ? JSON.parse(item.activityPayload) : {};

  // Load assessments attached to this activity. For Write activities, the first
  // open_ended assessment is the built-in submission target (rendered inline) — skip it
  // from the listed assessments below the activity body.
  const allAssessments = await db
    .select({
      id: assessments.id,
      type: assessments.type,
      title: assessments.title,
      description: assessments.description,
      graded: assessments.graded,
      dueAt: assessments.dueAt,
      order: assessments.order,
    })
    .from(assessments)
    .where(eq(assessments.activityId, activityId))
    .orderBy(asc(assessments.order));

  let builtInWriteAssessmentId: string | null = null;
  let existingWriteSubmission: { submissionText: string | null } | null = null;
  let writeSubmissions: Array<{ email: string; submissionText: string | null; submittedAt: Date }> = [];

  if (item.activityType === "write") {
    const builtIn = allAssessments.find((a) => a.type === "open_ended") ?? null;
    builtInWriteAssessmentId = builtIn?.id ?? null;

    if (builtInWriteAssessmentId && user.role === "learner") {
      const sub = await db
        .select({ submissionText: submissions.submissionText })
        .from(submissions)
        .where(
          and(
            eq(submissions.assessmentId, builtInWriteAssessmentId),
            eq(submissions.userId, user.id)
          )
        )
        .limit(1);
      existingWriteSubmission = sub[0] ?? null;
    }

    if (builtInWriteAssessmentId && (isOwner || isAdmin)) {
      const subs = await db
        .select({
          email: users.email,
          submissionText: submissions.submissionText,
          submittedAt: submissions.submittedAt,
        })
        .from(submissions)
        .leftJoin(users, eq(submissions.userId, users.id))
        .where(eq(submissions.assessmentId, builtInWriteAssessmentId));
      writeSubmissions = subs.map((s) => ({
        email: s.email ?? "",
        submissionText: s.submissionText,
        submittedAt: s.submittedAt,
      }));
    }
  }

  const listedAssessments = allAssessments.filter((a) => a.id !== builtInWriteAssessmentId);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {ACTIVITY_LABEL[item.activityType] ?? item.activityType}
        </p>
        <h1 className="text-3xl font-semibold text-foreground">{item.activityTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {item.sectionTitle} — {item.moduleTitle} •{" "}
          <Link className="text-foreground underline" href={`/courses/${courseId}`}>
            {courseId}
          </Link>
        </p>
      </div>

      {notice && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Watch ── */}
      {item.activityType === "watch" && (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${payload.youtubeId}`}
              title={item.activityTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full rounded-lg border border-border/60"
            />
          </div>
        </div>
      )}

      {/* ── Listen ── */}
      {item.activityType === "listen" && (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10 space-y-3">
          <audio controls className="w-full" src={payload.audioUrl ?? item.activityContent}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* ── Read ── */}
      {item.activityType === "read" && payload.fileType === "pdf" && (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10 space-y-3">
          <iframe
            src={item.activityContent}
            className="w-full rounded border border-border/60"
            style={{ height: "80vh" }}
          />
          <a
            href={item.activityContent}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-foreground underline hover:text-primary transition-colors"
          >
            Open PDF in new tab
          </a>
          {(isOwner || isAdmin) && (
            <div className="rounded-lg border border-border/60 bg-card/70 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Generate MCQ Quiz</p>
              <p className="text-xs text-muted-foreground">
                Use AI to generate multiple-choice questions from this PDF. A new MCQ assessment
                will be attached to this activity.
              </p>
              <form action={generateMcqFromPdfAction} className="flex items-center gap-3">
                <input type="hidden" name="activityId" value={activityId} />
                <label className="text-xs text-muted-foreground" htmlFor="num-questions">
                  Questions:
                </label>
                <select
                  id="num-questions"
                  name="numQuestions"
                  defaultValue="10"
                  className="flex h-7 w-20 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="20">20</option>
                </select>
                <GenerateMcqButton />
              </form>
            </div>
          )}
        </div>
      )}

      {item.activityType === "read" && payload.fileType === "markdown" && (isOwner || isAdmin) ? (
        <MarkdownItemEditor
          itemId={activityId}
          initialTitle={item.activityTitle}
          initialContent={item.activityContent}
          redirectTo={`/courses/${courseId}/activities/${activityId}`}
        />
      ) : item.activityType === "read" && payload.fileType === "markdown" ? (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {item.activityContent}
            </ReactMarkdown>
          </div>
        </div>
      ) : item.activityType === "read" && payload.fileType === "html" && (isOwner || isAdmin) ? (
        <HtmlItemEditor
          itemId={activityId}
          initialTitle={item.activityTitle}
          initialContent={item.activityContent}
          redirectTo={`/courses/${courseId}/activities/${activityId}`}
        />
      ) : item.activityType === "read" && payload.fileType === "html" ? (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10">
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: item.activityContent }}
          />
        </div>
      ) : item.activityType === "read" && payload.fileType === "normalized" && payload.blocks ? (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10">
          <NormalizedContentRenderer blocks={payload.blocks} />
        </div>
      ) : null}

      {/* ── Write ── */}
      {item.activityType === "write" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10 space-y-3">
            <p className="text-sm font-semibold text-foreground">Prompt</p>
            <p className="text-sm text-foreground/90 leading-7 whitespace-pre-wrap">
              {payload.prompt ?? item.activityContent}
            </p>
            {(payload.minChars || payload.maxChars) && (
              <p className="text-xs text-muted-foreground">
                {payload.minChars && payload.maxChars
                  ? `${payload.minChars}–${payload.maxChars} characters`
                  : payload.minChars
                  ? `Minimum ${payload.minChars} characters`
                  : `Maximum ${payload.maxChars} characters`}
              </p>
            )}
          </div>

          {user.role === "learner" && (
            <WriteActivityClient
              activityId={activityId}
              courseId={courseId}
              minChars={payload.minChars ?? null}
              maxChars={payload.maxChars ?? null}
              initialText={existingWriteSubmission?.submissionText ?? ""}
              submitAction={submitWriteActivityAction}
            />
          )}

          {(isOwner || isAdmin) && (
            <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-8 md:px-10 md:py-10 space-y-4">
              <p className="text-sm font-semibold text-foreground">
                Submissions ({writeSubmissions.length})
              </p>
              {writeSubmissions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No submissions yet.</p>
              ) : (
                <ul className="space-y-4">
                  {writeSubmissions.map((sub, i) => (
                    <li key={i} className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-1">
                      <p className="text-xs font-semibold text-foreground">{sub.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.submittedAt.toLocaleString()}
                      </p>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-2">
                        {sub.submissionText ?? "(no text)"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Assessments attached to this activity ── */}
      {listedAssessments.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card/80 px-6 py-6 space-y-3">
          <p className="text-sm font-semibold text-foreground">Assessments</p>
          <ul className="space-y-2">
            {listedAssessments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/courses/${courseId}/activities/${activityId}/assessments/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-4 py-3 hover:bg-background"
                >
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-foreground">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {a.type === "mcq" ? "Multiple choice" : "Open-ended"}
                      {a.graded ? " • Graded" : " • Formative"}
                      {a.dueAt ? ` • Due ${a.dueAt.toLocaleDateString()}` : ""}
                    </span>
                  </span>
                  <Badge variant="secondary">{a.type === "mcq" ? "Quiz" : "Prompt"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        {prev ? (
          <Link
            className="text-sm font-semibold text-foreground underline"
            href={`/courses/${courseId}/activities/${prev.id}`}
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {user.role === "learner" && item.activityType !== "write" ? (
            <form action={markActivityCompleteAction}>
              <input type="hidden" name="activityId" value={activityId} />
              <Button type="submit" variant="outline" disabled={isCompleted}>
                {isCompleted ? "Completed" : "Mark complete"}
              </Button>
            </form>
          ) : null}
          {next ? (
            <Link
              className="text-sm font-semibold text-foreground underline"
              href={`/courses/${courseId}/activities/${next.id}`}
            >
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
