import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  activities,
  assessments,
  enrollments,
  grades,
  modules,
  sections,
  submissions,
  users,
} from "@/lib/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { CourseTabs } from "../_components/course-tabs";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ courseId: string }> };

export default async function GradebookPage({ params }: Props) {
  const { courseId } = await params;
  const db = await getDb();
  const user = await getCurrentUser();

  if (!user) redirect("/sign-in");

  const course = await db.query.courses.findFirst({
    where: (c, { eq }) => eq(c.id, courseId),
  });
  if (!course) notFound();

  const isOwner = user.role === "instructor" && user.id === course.instructorId;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) redirect(`/courses/${courseId}`);

  // All assessments in this course (joined through activity → section → module).
  // Show only graded assessments — formative assessments don't belong in a grade view.
  const assessmentList = await db
    .select({
      id: assessments.id,
      activityId: assessments.activityId,
      title: assessments.title,
      type: assessments.type,
      activityTitle: activities.title,
    })
    .from(assessments)
    .leftJoin(activities, eq(assessments.activityId, activities.id))
    .leftJoin(sections, eq(activities.sectionId, sections.id))
    .leftJoin(modules, eq(sections.moduleId, modules.id))
    .where(and(eq(modules.courseId, courseId), eq(assessments.graded, true)))
    .orderBy(asc(assessments.createdAt));

  // Enrolled learners
  const learnerList = await db
    .select({ id: users.id, email: users.email })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .where(eq(enrollments.courseId, courseId))
    .orderBy(users.email);

  // Submissions + grades for all assessments in this course
  type CellData = { submittedAt: Date; score: number | null };
  const cellMap = new Map<string, CellData>();

  if (assessmentList.length > 0 && learnerList.length > 0) {
    const rows = await db
      .select({
        assessmentId: submissions.assessmentId,
        userId: submissions.userId,
        submittedAt: submissions.submittedAt,
        score: grades.score,
      })
      .from(submissions)
      .leftJoin(grades, eq(grades.submissionId, submissions.id))
      .where(inArray(submissions.assessmentId, assessmentList.map((a) => a.id)));

    for (const row of rows) {
      cellMap.set(`${row.userId}-${row.assessmentId}`, {
        submittedAt: row.submittedAt,
        score: row.score ?? null,
      });
    }
  }

  // Per-assessment averages
  const assessmentAvg = assessmentList.map((a) => {
    const scored = learnerList
      .map((l) => cellMap.get(`${l.id}-${a.id}`)?.score)
      .filter((s): s is number => s !== null && s !== undefined);
    return scored.length ? Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length) : null;
  });

  // Per-learner averages
  const learnerAvg = learnerList.map((l) => {
    const scored = assessmentList
      .map((a) => cellMap.get(`${l.id}-${a.id}`)?.score)
      .filter((s): s is number => s !== null && s !== undefined);
    return scored.length ? Math.round(scored.reduce((sum, s) => sum + s, 0) / scored.length) : null;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{course.title}</h1>
        </div>
        <Suspense fallback={<div className="h-9" />}>
          <CourseTabs courseId={courseId} canEdit={true} />
        </Suspense>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Gradebook
          <span className="ml-2 font-normal text-slate-400">
            {learnerList.length} {learnerList.length === 1 ? "learner" : "learners"} ·{" "}
            {assessmentList.length} graded {assessmentList.length === 1 ? "assessment" : "assessments"}
          </span>
        </h2>

        {assessmentList.length === 0 ? (
          <p className="text-sm text-slate-400">No graded assessments in this course yet.</p>
        ) : learnerList.length === 0 ? (
          <p className="text-sm text-slate-400">No learners enrolled yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 bg-slate-50 px-4 py-2.5 text-left font-semibold text-slate-700 min-w-[200px]">
                    Learner
                  </th>
                  {assessmentList.map((a, i) => (
                    <th
                      key={a.id}
                      className="px-3 py-2.5 text-center font-semibold text-slate-700 min-w-[110px]"
                    >
                      <div className="truncate max-w-[100px] mx-auto" title={a.title}>
                        {a.title}
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 uppercase tracking-wide">
                        {a.type === "mcq" ? "MCQ" : "Open"}
                        {assessmentAvg[i] !== null && (
                          <span className="ml-1">· avg {assessmentAvg[i]}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-700 min-w-[80px]">
                    Avg
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {learnerList.map((learner, li) => (
                  <tr key={learner.id} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 bg-white px-4 py-2.5 text-slate-800 hover:bg-slate-50 font-medium truncate max-w-[200px]">
                      {learner.email}
                    </td>
                    {assessmentList.map((a) => {
                      const cell = cellMap.get(`${learner.id}-${a.id}`);
                      return (
                        <td key={a.id} className="px-3 py-2.5 text-center">
                          <ScoreCell cell={cell} />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold">
                      {learnerAvg[li] !== null ? (
                        <span className={scoreColor(learnerAvg[li]!)}>{learnerAvg[li]}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {assessmentList.length > 0 && learnerList.length > 0 && (
          <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
              Graded ≥ 70
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-100 border border-yellow-300" />
              Graded 50–69
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100 border border-red-300" />
              Graded &lt; 50
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-100 border border-slate-300" />
              Submitted, ungraded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-white border border-slate-200" />
              Not submitted
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-700";
  if (score >= 50) return "text-yellow-700";
  return "text-red-700";
}

function ScoreCell({ cell }: { cell: { submittedAt: Date; score: number | null } | undefined }) {
  if (!cell) {
    return <span className="text-slate-200">—</span>;
  }
  if (cell.score === null) {
    return (
      <span className="inline-block rounded px-2 py-0.5 text-xs bg-slate-100 text-slate-500">
        Submitted
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-block rounded px-2 py-0.5 text-xs font-semibold",
        cell.score >= 70
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : cell.score >= 50
          ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
          : "bg-red-50 text-red-700 border border-red-200"
      )}
    >
      {cell.score}
    </span>
  );
}
