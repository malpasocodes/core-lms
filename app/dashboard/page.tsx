import { redirect } from "next/navigation";
import Link from "next/link";

import { currentUser } from "@clerk/nextjs/server";
import { eq, count } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { courses, enrollments, userProfiles } from "@/lib/schema";
import { CourseList } from "./_components/course-list";
import { ProfileCard } from "./_components/profile-card";
import { getCourseJourney } from "@/lib/journey";
import { MetroLine } from "@/components/journey/metro-line";

type DashboardPageProps = {
  searchParams?: Promise<{ notice?: string; error?: string }>;
};

export default async function DashboardPage(props: DashboardPageProps) {
  const user = await getCurrentUser();

  if (user?.role === "admin") {
    redirect("/admin");
  }

  const { notice, error } = (await props.searchParams) ?? {};

  const db = user ? await getDb() : null;
  const isInstructor = user?.role === "instructor";
  const isLearner = user?.role === "learner";

  // ── Learner view: profile + announcements placeholder ────────────────────
  if (isLearner && user && db) {
    const clerk = await currentUser();
    const profileRow = await db
      .select({
        preferredName: userProfiles.preferredName,
        timezone: userProfiles.timezone,
        location: userProfiles.location,
        linkedin: userProfiles.linkedin,
        bio: userProfiles.bio,
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);
    const profile = profileRow[0] ?? null;

    const enrolledRows = await db
      .select({ id: courses.id, title: courses.title })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, user.id));
    const enrolledCourses = enrolledRows.filter(
      (c): c is { id: string; title: string } => Boolean(c.id && c.title)
    );

    const courseJourneys = await Promise.all(
      enrolledCourses.map(async (c) => {
        const journey = await getCourseJourney(c.id, user.id);
        const activeModule =
          journey.modules.find((m) => m.status === "in_progress") ??
          journey.modules.find((m) => m.status === "not_started") ??
          journey.modules[journey.modules.length - 1] ??
          null;
        return { course: c, journey, activeModule };
      })
    );

    const displayName =
      profile?.preferredName ||
      clerk?.firstName ||
      user.email.split("@")[0] ||
      "there";

    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Welcome back, {displayName}.
          </h1>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Your courses</h2>
            <p className="text-sm text-slate-500">
              {enrolledCourses.length === 0
                ? "You are not enrolled in any courses yet."
                : `${enrolledCourses.length} ${enrolledCourses.length === 1 ? "course" : "courses"}`}
            </p>
          </div>
          {courseJourneys.length > 0 && (
            <ul className="mt-6 space-y-4">
              {courseJourneys.map(({ course, journey, activeModule }) => {
                const currentStation = journey.modules
                  .flatMap((m) => m.stations)
                  .find((s) => s.status === "current");
                const allComplete =
                  journey.totalActivities > 0 &&
                  journey.completedActivities === journey.totalActivities;
                return (
                  <li
                    key={course.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 md:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <Link
                          href={`/courses/${course.id}`}
                          className="text-base font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
                        >
                          {course.title}
                        </Link>
                        {journey.totalActivities > 0 ? (
                          <p className="text-xs text-slate-500">
                            {journey.completedActivities} of {journey.totalActivities} activities complete
                          </p>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            No content yet
                          </p>
                        )}
                      </div>
                      {currentStation?.href ? (
                        <Link
                          href={currentStation.href}
                          className="shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-sm transition-colors hover:bg-emerald-700"
                          aria-label={`Continue: ${currentStation.label}`}
                        >
                          Continue →
                        </Link>
                      ) : allComplete ? (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-purple-700">
                          <svg
                            viewBox="0 0 12 12"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="2.5,6.5 5,9 9.5,3.5" />
                          </svg>
                          All complete
                        </span>
                      ) : (
                        <Link
                          href={`/courses/${course.id}`}
                          className="shrink-0 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 hover:text-emerald-800"
                        >
                          Open →
                        </Link>
                      )}
                    </div>
                    {currentStation && (
                      <p className="mt-2 text-xs text-slate-600">
                        Up next:{" "}
                        <span className="font-semibold text-slate-900">
                          {currentStation.label}
                        </span>
                      </p>
                    )}
                    {activeModule && activeModule.stations.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Module {activeModule.order} · {activeModule.title}
                        </p>
                        <MetroLine
                          stations={activeModule.stations}
                          density="compact"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileCard
            avatarUrl={clerk?.imageUrl ?? null}
            displayName={clerk?.firstName ?? user.email.split("@")[0]}
            email={user.email}
            accountName={clerk?.fullName ?? null}
            preferredName={profile?.preferredName ?? null}
            timezone={profile?.timezone ?? null}
            location={profile?.location ?? null}
            linkedin={profile?.linkedin ?? null}
            bio={profile?.bio ?? null}
          />

          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 md:p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Announcements</h2>
              <p className="text-sm text-muted-foreground">Latest news and updates</p>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">No announcements yet.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Instructor view: existing layout (course list + widgets) ─────────────
  type CourseRow = { id: string; title: string; published: "true" | "false" };
  let activeCourses: CourseRow[] = [];
  let enrolledCount = 0;

  if (user && db) {
    if (isInstructor) {
      activeCourses = await db
        .select({ id: courses.id, title: courses.title, published: courses.published })
        .from(courses)
        .where(eq(courses.instructorId, user.id));
    } else {
      const rows = await db
        .select({ id: courses.id, title: courses.title, published: courses.published })
        .from(enrollments)
        .leftJoin(courses, eq(enrollments.courseId, courses.id))
        .where(eq(enrollments.userId, user.id));
      activeCourses = rows.filter(
        (c): c is CourseRow => Boolean(c.id && c.title && c.published)
      );
      const [{ value }] = await db
        .select({ value: count() })
        .from(enrollments)
        .where(eq(enrollments.userId, user.id));
      enrolledCount = value;
    }
  }

  const courseCount = activeCourses.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        {user && (
          <p className="mt-1 text-sm text-slate-500 capitalize">
            {user.role} · {user.email}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              {isInstructor ? "Your Courses" : "Enrolled Courses"}
            </h2>
            <CourseList
              heading=""
              emptyText={
                isInstructor
                  ? "No courses yet. Create one to get started."
                  : "You are not enrolled in any courses yet."
              }
              courses={activeCourses}
            />
            {isInstructor && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <Link
                  href="/instructor/enroll"
                  className="text-sm font-medium text-emerald-700 hover:text-emerald-600"
                >
                  Manage enrollments →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Overview</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  {isInstructor ? "Courses" : "Enrolled"}
                </span>
                <span className="font-semibold text-slate-900">{courseCount}</span>
              </div>
              {!isInstructor && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total enrollments</span>
                  <span className="font-semibold text-slate-900">{enrolledCount}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Quick Actions</h2>
            <div className="space-y-2 text-sm">
              <Link
                href="/courses"
                className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Browse courses →
              </Link>
              {isInstructor && (
                <Link
                  href="/courses/content"
                  className="block rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Manage content →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
