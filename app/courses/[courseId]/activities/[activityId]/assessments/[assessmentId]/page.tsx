import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gradeSubmissionAction, submitAssessmentAction } from "@/lib/assessment-actions";
import { submitMcqAction } from "@/lib/mcq-submit-actions";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  activities,
  assessments,
  courses,
  grades,
  mcqQuestions,
  modules,
  sections,
  submissions,
  users,
} from "@/lib/schema";

type AssessmentPageProps = {
  params: Promise<{ courseId: string; activityId: string; assessmentId: string }>;
};

export default async function AssessmentPage(props: AssessmentPageProps) {
  const { courseId, activityId, assessmentId } = (await props.params) || {};
  if (!courseId || !activityId || !assessmentId) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const db = await getDb();
  const assessmentRow = await db
    .select({
      assessmentId: assessments.id,
      title: assessments.title,
      description: assessments.description,
      type: assessments.type,
      mcqModel: assessments.mcqModel,
      graded: assessments.graded,
      visibility: assessments.visibility,
      weighting: assessments.weighting,
      dueAt: assessments.dueAt,
      activityId: activities.id,
      activityTitle: activities.title,
      courseId: courses.id,
      courseTitle: courses.title,
      instructorId: courses.instructorId,
    })
    .from(assessments)
    .leftJoin(activities, eq(assessments.activityId, activities.id))
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .leftJoin(courses, eq(modules.courseId, courses.id))
    .where(
      and(
        eq(assessments.id, assessmentId),
        eq(activities.id, activityId),
        eq(courses.id, courseId)
      )
    )
    .limit(1);

  const assessment = assessmentRow[0];
  if (!assessment) notFound();

  const isOwner = user.role === "instructor" && user.id === assessment.instructorId;
  const isAdmin = user.role === "admin";
  const isMcq = assessment.type === "mcq";

  let isEnrolled = false;
  if (user.role === "learner") {
    const enrollment = await db.query.enrollments.findFirst({
      columns: { id: true },
      where: (e, { and, eq }) => and(eq(e.courseId, courseId), eq(e.userId, user.id)),
    });
    isEnrolled = Boolean(enrollment);
  }

  if (!(isAdmin || isOwner || isEnrolled)) {
    redirect("/dashboard?error=Not%20enrolled%20in%20this%20course");
  }

  if (user.role === "learner" && assessment.visibility === "invisible") {
    redirect(`/courses/${courseId}/activities/${activityId}`);
  }

  const questions = isMcq
    ? await db
        .select()
        .from(mcqQuestions)
        .where(eq(mcqQuestions.assessmentId, assessmentId))
        .orderBy(asc(mcqQuestions.order))
    : [];

  const learnerSubmission =
    user.role === "learner"
      ? await db.query.submissions.findFirst({
          where: (s, { and, eq }) => and(eq(s.assessmentId, assessmentId), eq(s.userId, user.id)),
        })
      : null;
  const learnerGrade =
    user.role === "learner" && learnerSubmission
      ? await db.query.grades.findFirst({
          where: (g, { eq }) => eq(g.submissionId, learnerSubmission.id),
        })
      : null;

  const learnerAnswers: Record<string, number> =
    learnerSubmission?.mcqAnswers ? JSON.parse(learnerSubmission.mcqAnswers) : {};

  const allSubmissions =
    isAdmin || isOwner
      ? await db
          .select({
            id: submissions.id,
            userId: submissions.userId,
            submittedAt: submissions.submittedAt,
            submissionText: submissions.submissionText,
            fileUrl: submissions.fileUrl,
            mcqAnswers: submissions.mcqAnswers,
            email: users.email,
            gradeScore: grades.score,
            gradedAt: grades.gradedAt,
            gradedBy: grades.gradedBy,
          })
          .from(submissions)
          .leftJoin(users, eq(submissions.userId, users.id))
          .leftJoin(grades, eq(grades.submissionId, submissions.id))
          .where(eq(submissions.assessmentId, assessmentId))
      : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          {isMcq ? "Quiz" : "Assessment"}
          {assessment.weighting === "summative" ? " · Summative" : " · Formative"}
          {assessment.visibility === "invisible" ? " · Hidden from learners" : ""}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">{assessment.title}</h1>
        <p className="text-sm text-slate-600">
          Activity:{" "}
          <Link
            className="text-slate-900 underline hover:text-emerald-700"
            href={`/courses/${courseId}/activities/${activityId}`}
          >
            {assessment.activityTitle}
          </Link>{" "}
          ·{" "}
          <Link
            className="text-slate-900 underline hover:text-emerald-700"
            href={`/courses/${courseId}`}
          >
            ← Back to course
          </Link>
        </p>
        {assessment.dueAt && (() => {
          const overdue = assessment.dueAt! < new Date();
          return (
            <p className={`text-sm font-medium ${overdue ? "text-red-600" : "text-slate-500"}`}>
              Due: {assessment.dueAt!.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {overdue ? " — Overdue" : ""}
            </p>
          );
        })()}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {isMcq ? "About this quiz" : "Prompt"}
          </p>
          {assessment.description ? (
            <p className="whitespace-pre-wrap text-sm text-slate-900">{assessment.description}</p>
          ) : (
            <p className="text-sm text-slate-500">No description provided.</p>
          )}
        </div>

        {user.role === "learner" ? (
          isMcq ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Your answers</p>
                <Badge variant={learnerSubmission ? "default" : "secondary"}>
                  {learnerSubmission ? "Submitted" : "Not submitted"}
                </Badge>
              </div>

              {learnerGrade ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
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
                    Submitted · Score
                  </span>
                  <span className="text-sm font-semibold text-emerald-900">
                    {learnerGrade.score} / 100
                  </span>
                </div>
              ) : null}

              <form action={submitMcqAction} className="space-y-4">
                <input type="hidden" name="assessmentId" value={assessmentId} />
                {questions.map((q, i) => {
                  const opts: string[] = JSON.parse(q.options);
                  const chosen = learnerAnswers[q.id];
                  const isCorrect = chosen === q.correctIndex;
                  return (
                    <fieldset
                      key={q.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <legend className="px-1 text-sm font-semibold text-slate-900">
                        {i + 1}. {q.questionText}
                      </legend>
                      <div className="space-y-1.5">
                        {opts.map((opt, j) => {
                          const isCorrectOption = j === q.correctIndex;
                          const isLearnerChoice = chosen === j;
                          const baseClass =
                            "flex cursor-pointer items-start gap-2.5 rounded-md border bg-white px-3 py-2 text-sm transition-colors";
                          const stateClass = learnerGrade
                            ? isCorrectOption
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : isLearnerChoice && !isCorrect
                                ? "border-red-300 bg-red-50 text-red-700 line-through"
                                : "border-slate-200 text-slate-500"
                            : "border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50";
                          return (
                            <label key={j} className={`${baseClass} ${stateClass}`}>
                              <input
                                type="radio"
                                name={`answer_${q.id}`}
                                value={String(j)}
                                defaultChecked={chosen === j}
                                disabled={Boolean(learnerGrade)}
                                className="mt-0.5 accent-emerald-600"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                      {learnerGrade && q.explanation ? (
                        <p className="px-1 text-xs text-slate-600">
                          {isCorrect ? "✓ " : "✗ "}
                          {q.explanation}
                        </p>
                      ) : null}
                    </fieldset>
                  );
                })}
                {!learnerGrade && (
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Submit Quiz
                  </Button>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Your submission</p>
                {learnerSubmission ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-800">
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3,8 7,12 13,4" />
                    </svg>
                    Submitted
                  </span>
                ) : (
                  <Badge variant="secondary">Not submitted</Badge>
                )}
              </div>
              {learnerGrade ? (
                <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
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
                    Graded
                  </span>
                  <span className="text-sm font-semibold text-emerald-900">{learnerGrade.score} / 100</span>
                </div>
              ) : null}
              {learnerSubmission ? (
                <div className="space-y-2 text-sm text-slate-900">
                  {learnerSubmission.submissionText ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Text
                      </p>
                      <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        {learnerSubmission.submissionText}
                      </p>
                    </div>
                  ) : null}
                  {learnerSubmission.fileUrl ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        File URL
                      </p>
                      <a
                        className="text-slate-900 underline hover:text-emerald-700"
                        href={learnerSubmission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {learnerSubmission.fileUrl}
                      </a>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    Submitted {learnerSubmission.submittedAt?.toLocaleString() ?? "(unknown)"}
                  </p>
                </div>
              ) : null}
              {!learnerGrade && (
                <form action={submitAssessmentAction} className="space-y-3">
                  <input type="hidden" name="assessmentId" value={assessmentId} />
                  <div className="space-y-1">
                    <Label htmlFor="submission-text">Submission text</Label>
                    <Textarea
                      id="submission-text"
                      name="submissionText"
                      rows={6}
                      defaultValue={learnerSubmission?.submissionText ?? ""}
                      placeholder="Paste your response here (optional if you provide a file URL)"
                      className="focus-visible:border-emerald-400 focus-visible:ring-emerald-200 focus-visible:ring-[2px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="submission-file">File URL (optional)</Label>
                    <Input
                      id="submission-file"
                      name="fileUrl"
                      type="url"
                      defaultValue={learnerSubmission?.fileUrl ?? ""}
                      placeholder="https://example.com/artifact.pdf"
                      className="focus-visible:border-emerald-400 focus-visible:ring-emerald-200 focus-visible:ring-[2px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {learnerSubmission ? "Update submission" : "Submit"}
                  </Button>
                </form>
              )}
            </div>
          )
        ) : null}

        {(isAdmin || isOwner) && isMcq && assessment.mcqModel ? (
          <p className="text-xs text-slate-500">
            Generated by <span className="font-mono">{assessment.mcqModel}</span>
          </p>
        ) : null}

        {(isAdmin || isOwner) && isMcq && questions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              Questions ({questions.length})
            </p>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const opts: string[] = JSON.parse(q.options);
                return (
                  <div key={q.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-slate-900">
                      {i + 1}. {q.questionText}
                    </p>
                    <div className="space-y-1 pl-1">
                      {opts.map((opt, j) => (
                        <p
                          key={j}
                          className={`text-sm ${j === q.correctIndex ? "text-emerald-700 font-medium" : "text-slate-500"}`}
                        >
                          {j === q.correctIndex ? "✓ " : "○ "}
                          {opt}
                        </p>
                      ))}
                    </div>
                    {q.explanation ? (
                      <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                        {q.explanation}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {isAdmin || isOwner ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              Submissions ({allSubmissions.length})
            </p>
            {allSubmissions.length === 0 ? (
              <p className="text-sm text-slate-500">No submissions yet.</p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-slate-200 bg-white text-sm">
                {allSubmissions.map((sub) => (
                  <div key={sub.id} className="space-y-1 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{sub.email}</span>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500">
                        {sub.submittedAt?.toString() ?? ""}
                      </span>
                    </div>
                    {typeof sub.gradeScore === "number" ? (
                      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {isMcq ? "Score" : "Grade"}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{sub.gradeScore} / 100</p>
                          {sub.gradedAt ? (
                            <p className="text-[11px] text-slate-500">
                              {isMcq ? "Auto-graded" : `Graded ${sub.gradedAt.toString()}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : !isMcq && isOwner && assessment.graded ? (
                      <form action={gradeSubmissionAction} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                        <input type="hidden" name="submissionId" value={sub.id} />
                        <input type="hidden" name="assessmentId" value={assessmentId} />
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor={`grade-${sub.id}`}>Grade (0-100)</Label>
                          <Input
                            id={`grade-${sub.id}`}
                            name="score"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            required
                            className="w-24"
                          />
                        </div>
                        <Button type="submit" className="w-full">Save grade</Button>
                      </form>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {assessment.graded ? "Not graded yet." : "Formative — no grade."}
                      </p>
                    )}
                    {sub.submissionText ? (
                      <p className="whitespace-pre-wrap text-slate-900">{sub.submissionText}</p>
                    ) : null}
                    {sub.fileUrl ? (
                      <a className="text-slate-900 underline" href={sub.fileUrl} target="_blank" rel="noreferrer">
                        {sub.fileUrl}
                      </a>
                    ) : null}
                    {isMcq && sub.mcqAnswers && questions.length > 0
                      ? (() => {
                          let answers: Record<string, number> = {};
                          try {
                            answers = JSON.parse(sub.mcqAnswers);
                          } catch {
                            answers = {};
                          }
                          return (
                            <details className="rounded-md border border-slate-200 bg-slate-50">
                              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                View answers
                              </summary>
                              <div className="space-y-3 border-t border-slate-200 px-3 py-3">
                                {questions.map((q, i) => {
                                  const opts: string[] = JSON.parse(q.options);
                                  const chosen = answers[q.id];
                                  const answered = typeof chosen === "number";
                                  const isCorrect = answered && chosen === q.correctIndex;
                                  return (
                                    <div key={q.id} className="space-y-1">
                                      <p className="text-sm font-medium text-slate-900">
                                        {i + 1}. {q.questionText}{" "}
                                        <span
                                          className={
                                            isCorrect
                                              ? "text-emerald-700"
                                              : "text-red-600 dark:text-red-400"
                                          }
                                        >
                                          {isCorrect ? "✓" : "✗"}
                                        </span>
                                      </p>
                                      <div className="space-y-0.5 pl-1">
                                        {opts.map((opt, j) => (
                                          <p
                                            key={j}
                                            className={`text-sm ${
                                              j === q.correctIndex
                                                ? "text-emerald-700 font-medium"
                                                : j === chosen && !isCorrect
                                                  ? "text-red-600 dark:text-red-400 line-through"
                                                  : "text-slate-500"
                                            }`}
                                          >
                                            {j === q.correctIndex
                                              ? "✓ "
                                              : j === chosen
                                                ? "● "
                                                : "○ "}
                                            {opt}
                                          </p>
                                        ))}
                                      </div>
                                      {q.explanation ? (
                                        <p className="pl-1 pt-1 text-xs text-slate-500">
                                          {q.explanation}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        })()
                      : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
