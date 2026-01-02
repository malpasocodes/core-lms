import { notFound, redirect } from "next/navigation";

import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gradeSubmissionAction, submitAssignmentAction } from "@/lib/assignment-actions";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assignments, courses, grades, submissions, users } from "@/lib/schema";

type AssignmentPageProps = {
  params: Promise<{ courseId: string; assignmentId: string }>;
};

export default async function AssignmentPage(props: AssignmentPageProps) {
  const { courseId, assignmentId } = (await props.params) || {};
  if (!courseId || !assignmentId) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const db = await getDb();
  const assignmentRow = await db
    .select({
      assignmentId: assignments.id,
      title: assignments.title,
      description: assignments.description,
      courseId: courses.id,
      courseTitle: courses.title,
      instructorId: courses.instructorId,
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1);

  const assignment = assignmentRow[0];
  if (!assignment) notFound();

  const isOwner = user.role === "instructor" && user.id === assignment.instructorId;
  const isAdmin = user.role === "admin";

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

  const learnerSubmission =
    user.role === "learner"
      ? await db.query.submissions.findFirst({
          where: (s, { and, eq }) => and(eq(s.assignmentId, assignmentId), eq(s.userId, user.id)),
        })
      : null;
  const learnerGrade =
    user.role === "learner" && learnerSubmission
      ? await db.query.grades.findFirst({
          where: (g, { eq }) => eq(g.submissionId, learnerSubmission.id),
        })
      : null;

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
          .where(eq(submissions.assignmentId, assignmentId))
      : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assignment</p>
        <h1 className="text-3xl font-semibold text-foreground">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">
          Course:{" "}
          <Link className="text-foreground underline" href={`/courses/${courseId}`}>
            {assignment.courseTitle}
          </Link>
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prompt</p>
          {assignment.description ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">{assignment.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description provided.</p>
          )}
        </div>

        {user.role === "learner" ? (
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

            <form action={submitAssignmentAction} className="space-y-3">
              <input type="hidden" name="assignmentId" value={assignmentId} />
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
                {learnerSubmission ? "Update submission" : "Submit assignment"}
              </Button>
            </form>
          </div>
        ) : null}

        {isAdmin || isOwner ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Submissions ({allSubmissions.length})</p>
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
                          Grade
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{sub.gradeScore} / 100</p>
                          {sub.gradedAt ? (
                            <p className="text-[11px] text-muted-foreground">
                              Graded {sub.gradedAt.toString()}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : isOwner ? (
                      <form action={gradeSubmissionAction} className="space-y-2 rounded-md border border-border/60 bg-card/70 px-3 py-2">
                        <input type="hidden" name="submissionId" value={sub.id} />
                        <input type="hidden" name="assignmentId" value={assignmentId} />
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
                      <p className="text-xs text-muted-foreground">Not graded yet.</p>
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
