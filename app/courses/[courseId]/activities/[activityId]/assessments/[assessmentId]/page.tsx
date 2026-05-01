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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {isMcq ? "Quiz" : "Assessment"}
          {assessment.graded ? " · Graded" : " · Formative"}
        </p>
        <h1 className="text-3xl font-semibold text-foreground">{assessment.title}</h1>
        <p className="text-sm text-muted-foreground">
          Activity:{" "}
          <Link
            className="text-foreground underline"
            href={`/courses/${courseId}/activities/${activityId}`}
          >
            {assessment.activityTitle}
          </Link>{" "}
          · Course:{" "}
          <Link className="text-foreground underline" href={`/courses/${courseId}`}>
            {assessment.courseTitle}
          </Link>
        </p>
        {assessment.dueAt && (() => {
          const overdue = assessment.dueAt! < new Date();
          return (
            <p className={`text-sm font-medium ${overdue ? "text-red-600" : "text-muted-foreground"}`}>
              Due: {assessment.dueAt!.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {overdue ? " — Overdue" : ""}
            </p>
          );
        })()}
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {isMcq ? "About this quiz" : "Prompt"}
          </p>
          {assessment.description ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">{assessment.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description provided.</p>
          )}
        </div>

        {user.role === "learner" ? (
          isMcq ? (
            <div className="space-y-4 rounded-lg border border-border/60 bg-background/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Your answers</p>
                <Badge variant={learnerSubmission ? "default" : "secondary"}>
                  {learnerSubmission ? "Submitted" : "Not submitted"}
                </Badge>
              </div>

              {learnerGrade ? (
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/70 px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Score
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {learnerGrade.score} / 100
                  </span>
                </div>
              ) : null}

              <form action={submitMcqAction} className="space-y-6">
                <input type="hidden" name="assessmentId" value={assessmentId} />
                {questions.map((q, i) => {
                  const opts: string[] = JSON.parse(q.options);
                  const chosen = learnerAnswers[q.id];
                  const isCorrect = chosen === q.correctIndex;
                  return (
                    <fieldset key={q.id} className="space-y-2">
                      <legend className="text-sm font-medium text-foreground">
                        {i + 1}. {q.questionText}
                      </legend>
                      <div className="space-y-1.5 pl-1">
                        {opts.map((opt, j) => (
                          <label
                            key={j}
                            className="flex items-start gap-2.5 text-sm cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`answer_${q.id}`}
                              value={String(j)}
                              defaultChecked={chosen === j}
                              disabled={Boolean(learnerGrade)}
                              className="mt-0.5 accent-foreground"
                            />
                            <span
                              className={
                                learnerGrade
                                  ? j === q.correctIndex
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : j === chosen && !isCorrect
                                    ? "text-red-600 dark:text-red-400 line-through"
                                    : "text-muted-foreground"
                                  : "text-foreground"
                              }
                            >
                              {opt}
                            </span>
                          </label>
                        ))}
                      </div>
                      {learnerGrade && q.explanation ? (
                        <p className="text-xs text-muted-foreground pl-1 pt-1">
                          {isCorrect ? "✓ " : "✗ "}
                          {q.explanation}
                        </p>
                      ) : null}
                    </fieldset>
                  );
                })}
                {!learnerGrade && (
                  <Button type="submit">Submit Quiz</Button>
                )}
              </form>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-border/60 bg-background/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Your submission</p>
                <Badge variant={learnerSubmission ? "default" : "secondary"}>
                  {learnerSubmission ? "Submitted" : "Not submitted"}
                </Badge>
              </div>
              {learnerGrade ? (
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/70 px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Grade
                  </span>
                  <span className="text-sm font-semibold text-foreground">{learnerGrade.score} / 100</span>
                </div>
              ) : null}
              {learnerSubmission ? (
                <div className="space-y-2 text-sm text-foreground">
                  {learnerSubmission.submissionText ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Text</p>
                      <p className="whitespace-pre-wrap">{learnerSubmission.submissionText}</p>
                    </div>
                  ) : null}
                  {learnerSubmission.fileUrl ? (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">File URL</p>
                      <a className="text-foreground underline" href={learnerSubmission.fileUrl} target="_blank" rel="noreferrer">
                        {learnerSubmission.fileUrl}
                      </a>
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Updated at: {learnerSubmission.submittedAt?.toString() ?? "Unknown"}
                  </p>
                </div>
              ) : null}
              <form action={submitAssessmentAction} className="space-y-3">
                <input type="hidden" name="assessmentId" value={assessmentId} />
                <div className="space-y-1">
                  <Label htmlFor="submission-text">Submission text</Label>
                  <Textarea
                    id="submission-text"
                    name="submissionText"
                    rows={4}
                    defaultValue={learnerSubmission?.submissionText ?? ""}
                    placeholder="Paste your response here (optional if you provide a file URL)"
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
                  />
                </div>
                <Button type="submit">
                  {learnerSubmission ? "Update submission" : "Submit"}
                </Button>
              </form>
            </div>
          )
        ) : null}

        {(isAdmin || isOwner) && isMcq && assessment.mcqModel ? (
          <p className="text-xs text-muted-foreground">
            Generated by <span className="font-mono">{assessment.mcqModel}</span>
          </p>
        ) : null}

        {(isAdmin || isOwner) && isMcq && questions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              Questions ({questions.length})
            </p>
            <div className="space-y-4">
              {questions.map((q, i) => {
                const opts: string[] = JSON.parse(q.options);
                return (
                  <div key={q.id} className="rounded-lg border border-border/60 bg-background/80 px-4 py-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {i + 1}. {q.questionText}
                    </p>
                    <div className="space-y-1 pl-1">
                      {opts.map((opt, j) => (
                        <p
                          key={j}
                          className={`text-sm ${j === q.correctIndex ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}
                        >
                          {j === q.correctIndex ? "✓ " : "○ "}
                          {opt}
                        </p>
                      ))}
                    </div>
                    {q.explanation ? (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
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
            <p className="text-sm font-semibold text-foreground">
              Submissions ({allSubmissions.length})
            </p>
            {allSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border/60 bg-background/80 text-sm">
                {allSubmissions.map((sub) => (
                  <div key={sub.id} className="space-y-1 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{sub.email}</span>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {sub.submittedAt?.toString() ?? ""}
                      </span>
                    </div>
                    {typeof sub.gradeScore === "number" ? (
                      <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/70 px-3 py-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {isMcq ? "Score" : "Grade"}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{sub.gradeScore} / 100</p>
                          {sub.gradedAt ? (
                            <p className="text-[11px] text-muted-foreground">
                              {isMcq ? "Auto-graded" : `Graded ${sub.gradedAt.toString()}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : !isMcq && isOwner && assessment.graded ? (
                      <form action={gradeSubmissionAction} className="space-y-2 rounded-md border border-border/60 bg-card/70 px-3 py-2">
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
                      <p className="text-xs text-muted-foreground">
                        {assessment.graded ? "Not graded yet." : "Formative — no grade."}
                      </p>
                    )}
                    {sub.submissionText ? (
                      <p className="whitespace-pre-wrap text-foreground">{sub.submissionText}</p>
                    ) : null}
                    {sub.fileUrl ? (
                      <a className="text-foreground underline" href={sub.fileUrl} target="_blank" rel="noreferrer">
                        {sub.fileUrl}
                      </a>
                    ) : null}
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
