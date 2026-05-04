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
import { activities, activityNotes, assessments, courses, modules, sections, submissions, users } from "@/lib/schema";
import { markActivityCompleteAction } from "@/lib/progress-actions";
import { NormalizedContentRenderer } from "@/components/normalized-content-renderer";
import { MarkdownItemEditor } from "@/components/markdown-item-editor";
import { HtmlItemEditor } from "@/components/html-item-editor";
import { GenerateMcqButton } from "@/components/generate-mcq-button";
import { generateMcqFromActivityAction } from "@/lib/mcq-actions";
import {
  submitWriteActivityAction,
  updateWatchActivityTranscriptAction,
} from "@/lib/module-actions";
import { WriteActivityClient } from "@/components/write-activity-client";
import { WatchNotesClient } from "@/components/watch-notes-client";
import { getCourseJourney } from "@/lib/journey";

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

  // Compute the next station across the whole course (cross-section, cross-module)
  // for the post-completion CTA. Only relevant for learners.
  let courseNextStation: { id: string; label: string; href: string } | null = null;
  let courseAllComplete = false;
  if (user.role === "learner") {
    const journey = await getCourseJourney(courseId, user.id);
    const allStations = journey.modules.flatMap((m) => m.stations);
    const i = allStations.findIndex((s) => s.id === activityId);
    const candidate = i >= 0 ? allStations[i + 1] : null;
    if (candidate?.href) {
      courseNextStation = { id: candidate.id, label: candidate.label, href: candidate.href };
    } else if (
      journey.totalActivities > 0 &&
      journey.completedActivities === journey.totalActivities
    ) {
      courseAllComplete = true;
    }
  }

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

  let watchNote: { notes: string } | null = null;
  if (item.activityType === "watch" && user.role === "learner") {
    const noteRow = await db
      .select({ notes: activityNotes.notes })
      .from(activityNotes)
      .where(and(eq(activityNotes.activityId, activityId), eq(activityNotes.userId, user.id)))
      .limit(1);
    watchNote = noteRow[0] ?? null;
  }

  type WatchNoteRow = {
    email: string;
    notes: string;
    aiScore: number | null;
    aiAnalysis: string | null;
    aiStatus: string | null;
    updatedAt: Date;
  };
  let instructorWatchNotes: WatchNoteRow[] = [];
  if (item.activityType === "watch" && (isOwner || isAdmin)) {
    const rows = await db
      .select({
        email: users.email,
        notes: activityNotes.notes,
        aiScore: activityNotes.aiScore,
        aiAnalysis: activityNotes.aiAnalysis,
        aiStatus: activityNotes.aiStatus,
        updatedAt: activityNotes.updatedAt,
      })
      .from(activityNotes)
      .leftJoin(users, eq(activityNotes.userId, users.id))
      .where(eq(activityNotes.activityId, activityId))
      .orderBy(asc(activityNotes.updatedAt));
    instructorWatchNotes = rows.map((r) => ({
      email: r.email ?? "",
      notes: r.notes,
      aiScore: r.aiScore,
      aiAnalysis: r.aiAnalysis,
      aiStatus: r.aiStatus,
      updatedAt: r.updatedAt,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          {ACTIVITY_LABEL[item.activityType] ?? item.activityType}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{item.activityTitle}</h1>
        <p className="text-sm text-slate-600">
          {item.sectionTitle} — {item.moduleTitle} ·{" "}
          <Link
            className="text-slate-900 underline hover:text-emerald-700"
            href={`/courses/${courseId}`}
          >
            ← Back to course
          </Link>
        </p>
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

      {user.role === "learner" && isCompleted && courseNextStation && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="3,8 7,12 13,4" />
                </svg>
                Completed · Up next
              </p>
              <p className="text-base font-semibold text-slate-900">
                {courseNextStation.label}
              </p>
            </div>
            <Link
              href={courseNextStation.href}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Next →
            </Link>
          </div>
        </div>
      )}

      {user.role === "learner" && isCompleted && courseAllComplete && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3,8 7,12 13,4" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-700">
                Course complete
              </p>
              <p className="text-sm text-slate-900">
                You finished every activity in this course.{" "}
                <Link
                  href={`/courses/${courseId}`}
                  className="font-semibold underline hover:text-emerald-700"
                >
                  Back to course
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Watch ── */}
      {item.activityType === "watch" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10 space-y-4">
          {user.role === "learner" && isCompleted ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm text-slate-500">
                You&apos;ve marked this video complete. The video is no longer available for replay.
              </p>
            </div>
          ) : (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={`https://www.youtube.com/embed/${payload.youtubeId}`}
                title={item.activityTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full rounded-lg border border-slate-200"
              />
            </div>
          )}

          {user.role === "learner" && (
            <WatchNotesClient
              activityId={activityId}
              initial={watchNote?.notes ?? ""}
              locked={isCompleted}
            />
          )}

          {(isOwner || isAdmin) && (
            <>
              <form
                action={updateWatchActivityTranscriptAction}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3"
              >
                <input type="hidden" name="activityId" value={activityId} />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={`/courses/${courseId}/activities/${activityId}`}
                />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Transcript</p>
                  <p className="text-xs text-slate-500">
                    Paste the video transcript to enable MCQ generation.
                  </p>
                </div>
                <textarea
                  name="transcript"
                  defaultValue={typeof payload.transcript === "string" ? payload.transcript : ""}
                  rows={10}
                  placeholder="Paste the video transcript here…"
                  className="flex w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm font-mono transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30 resize-y"
                />
                <Button type="submit" size="sm">
                  Save transcript
                </Button>
              </form>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">Generate MCQ Quiz</p>
                <p className="text-xs text-slate-500">
                  Use AI to generate multiple-choice questions from the saved transcript. A new MCQ
                  assessment will be attached to this activity.
                </p>
                {typeof payload.transcript === "string" && payload.transcript.trim().length > 0 ? (
                  <form action={generateMcqFromActivityAction} className="flex items-center gap-3">
                    <input type="hidden" name="activityId" value={activityId} />
                    <label
                      className="text-xs text-slate-500"
                      htmlFor="watch-num-questions"
                    >
                      Questions:
                    </label>
                    <select
                      id="watch-num-questions"
                      name="numQuestions"
                      defaultValue="5"
                      className="flex h-7 w-20 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
                    >
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                    </select>
                    <GenerateMcqButton />
                  </form>
                ) : (
                  <p className="text-xs italic text-slate-500">
                    Save a transcript first to enable quiz generation.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Learner notes &amp; AI analysis ({instructorWatchNotes.length})
                  </p>
                  <p className="text-xs text-slate-500">
                    Score 1–10 against the saved transcript. Visible to instructors only.
                  </p>
                </div>
                {instructorWatchNotes.length === 0 ? (
                  <p className="text-xs italic text-slate-500">No learner notes yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {instructorWatchNotes.map((row, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-200 bg-white p-4 space-y-2"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">{row.email}</p>
                          <div className="flex items-center gap-2">
                            {row.aiStatus === "complete" && row.aiScore !== null ? (
                              <Badge variant="secondary">{row.aiScore}/10</Badge>
                            ) : row.aiStatus === "pending" ? (
                              <Badge variant="outline">Analyzing…</Badge>
                            ) : row.aiStatus === "failed" ? (
                              <Badge variant="destructive">Analysis failed</Badge>
                            ) : null}
                            <p className="text-xs text-slate-500">
                              {row.updatedAt.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Notes
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-slate-800">
                            {row.notes || "(no notes)"}
                          </p>
                        </div>
                        {row.aiAnalysis && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Analysis
                            </p>
                            <p className="whitespace-pre-wrap text-sm text-slate-800">
                              {row.aiAnalysis}
                            </p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Listen ── */}
      {item.activityType === "listen" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10 space-y-3">
          <audio controls className="w-full" src={payload.audioUrl ?? item.activityContent}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* ── Read ── */}
      {item.activityType === "read" && payload.fileType === "pdf" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10 space-y-3">
          <iframe
            src={item.activityContent}
            className="w-full rounded border border-slate-200"
            style={{ height: "80vh" }}
          />
          <a
            href={item.activityContent}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-900 underline hover:text-emerald-700 transition-colors"
          >
            Open PDF in new tab
          </a>
          {(isOwner || isAdmin) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Generate MCQ Quiz</p>
              <p className="text-xs text-slate-500">
                Use AI to generate multiple-choice questions from this PDF. A new MCQ assessment
                will be attached to this activity.
              </p>
              <form action={generateMcqFromActivityAction} className="flex items-center gap-3">
                <input type="hidden" name="activityId" value={activityId} />
                <label className="text-xs text-slate-500" htmlFor="num-questions">
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
        <div className="space-y-3">
          <MarkdownItemEditor
            itemId={activityId}
            initialTitle={item.activityTitle}
            initialContent={item.activityContent}
            redirectTo={`/courses/${courseId}/activities/${activityId}`}
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Generate MCQ Quiz</p>
            <p className="text-xs text-slate-500">
              Use AI to generate multiple-choice questions from this Markdown content. A new MCQ
              assessment will be attached to this activity.
            </p>
            <form action={generateMcqFromActivityAction} className="flex items-center gap-3">
              <input type="hidden" name="activityId" value={activityId} />
              <label className="text-xs text-slate-500" htmlFor="md-num-questions">
                Questions:
              </label>
              <select
                id="md-num-questions"
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
        </div>
      ) : item.activityType === "read" && payload.fileType === "markdown" ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10">
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10">
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: item.activityContent }}
          />
        </div>
      ) : item.activityType === "read" && payload.fileType === "normalized" && payload.blocks ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10">
          <NormalizedContentRenderer blocks={payload.blocks} />
        </div>
      ) : null}

      {/* ── Write ── */}
      {item.activityType === "write" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Prompt</p>
            <p className="text-sm text-slate-800 leading-7 whitespace-pre-wrap">
              {payload.prompt ?? item.activityContent}
            </p>
            {(payload.minChars || payload.maxChars) && (
              <p className="text-xs text-slate-500">
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
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-8 md:px-10 md:py-10 space-y-4">
              <p className="text-sm font-semibold text-slate-900">
                Submissions ({writeSubmissions.length})
              </p>
              {writeSubmissions.length === 0 ? (
                <p className="text-xs text-slate-500">No submissions yet.</p>
              ) : (
                <ul className="space-y-4">
                  {writeSubmissions.map((sub, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1">
                      <p className="text-xs font-semibold text-slate-900">{sub.email}</p>
                      <p className="text-xs text-slate-500">
                        {sub.submittedAt.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap mt-2">
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
      {listedAssessments.length > 0 &&
        !(user.role === "learner" && item.activityType === "watch") && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-6 space-y-3">
          <p className="text-sm font-semibold text-slate-900">Assessments</p>
          <ul className="space-y-2">
            {listedAssessments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/courses/${courseId}/activities/${activityId}/assessments/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
                >
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-slate-900">{a.title}</span>
                    <span className="block text-xs text-slate-500">
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
            className="text-sm font-semibold text-slate-900 underline"
            href={`/courses/${courseId}/activities/${prev.id}`}
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {user.role === "learner" &&
          item.activityType !== "write" &&
          item.activityType !== "watch" ? (
            <form action={markActivityCompleteAction}>
              <input type="hidden" name="activityId" value={activityId} />
              <Button type="submit" variant="outline" disabled={isCompleted}>
                {isCompleted ? "Completed" : "Mark complete"}
              </Button>
            </form>
          ) : null}
          {next ? (
            <Link
              className="text-sm font-semibold text-slate-900 underline"
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
