import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { activities, assessments, completions, modules, sections } from "@/lib/schema";

export type StationStatus = "locked" | "current" | "done";
export type ActivityType = "watch" | "listen" | "read" | "write";
export type AssessmentType = "open_ended" | "mcq";

export type Station = {
  id: string;
  label: string;
  status: StationStatus;
  type: ActivityType;
  href?: string;
  assessments: AssessmentType[];
};

export type SectionBreak = {
  afterId: string;
  label: string;
};

export type ModuleStatus = "not_started" | "in_progress" | "completed";

export type JourneyModule = {
  id: string;
  title: string;
  order: number;
  status: ModuleStatus;
  stations: Station[];
  sectionBreaks: SectionBreak[];
  showComingSoon: boolean;
  totalActivities: number;
  completedActivities: number;
};

export type CourseJourney = {
  courseId: string;
  modules: JourneyModule[];
  totalActivities: number;
  completedActivities: number;
};

const COMING_SOON_THRESHOLD = 0;

export async function getCourseJourney(
  courseId: string,
  userId: string
): Promise<CourseJourney> {
  const db = await getDb();

  const moduleRows = await db
    .select({ id: modules.id, title: modules.title, order: modules.order })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(asc(modules.order));

  if (moduleRows.length === 0) {
    return { courseId, modules: [], totalActivities: 0, completedActivities: 0 };
  }

  const moduleIds = moduleRows.map((m) => m.id);

  const sectionRows = await db
    .select({
      id: sections.id,
      moduleId: sections.moduleId,
      title: sections.title,
      order: sections.order,
    })
    .from(sections)
    .where(inArray(sections.moduleId, moduleIds))
    .orderBy(asc(sections.order));

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
          .orderBy(asc(activities.order))
      : [];

  const activityIds = activityRows.map((a) => a.id);

  const assessmentRows =
    activityIds.length > 0
      ? await db
          .select({
            activityId: assessments.activityId,
            type: assessments.type,
            order: assessments.order,
          })
          .from(assessments)
          .where(
            and(
              inArray(assessments.activityId, activityIds),
              eq(assessments.visibility, "visible"),
            ),
          )
          .orderBy(asc(assessments.order))
      : [];

  const completionRows =
    activityIds.length > 0
      ? await db
          .select({ activityId: completions.activityId })
          .from(completions)
          .where(
            and(
              eq(completions.userId, userId),
              inArray(completions.activityId, activityIds)
            )
          )
      : [];

  const completedSet = new Set(completionRows.map((c) => c.activityId));

  const assessmentsByActivity = new Map<string, AssessmentType[]>();
  for (const row of assessmentRows) {
    const list = assessmentsByActivity.get(row.activityId) ?? [];
    list.push(row.type as AssessmentType);
    assessmentsByActivity.set(row.activityId, list);
  }

  const sectionsByModule = new Map<string, typeof sectionRows>();
  for (const s of sectionRows) {
    const list = sectionsByModule.get(s.moduleId) ?? [];
    list.push(s);
    sectionsByModule.set(s.moduleId, list);
  }

  const activitiesBySection = new Map<string, typeof activityRows>();
  for (const a of activityRows) {
    const list = activitiesBySection.get(a.sectionId) ?? [];
    list.push(a);
    activitiesBySection.set(a.sectionId, list);
  }

  // First non-done activity across the whole course is "current".
  // Activities before it are 'done' (if completed) or 'current' position has passed → still locked? No:
  //   - Anything completed → done
  //   - The first non-completed activity in course order → current
  //   - Everything after that → locked
  // Free-roam in the UI is enforced separately (clicking still works server-side); MetroLine just visualizes.
  let currentSeen = false;
  const stationStatusById = new Map<string, StationStatus>();
  for (const m of moduleRows) {
    const moduleSections = sectionsByModule.get(m.id) ?? [];
    for (const s of moduleSections) {
      const moduleActivities = activitiesBySection.get(s.id) ?? [];
      for (const a of moduleActivities) {
        if (completedSet.has(a.id)) {
          stationStatusById.set(a.id, "done");
        } else if (!currentSeen) {
          stationStatusById.set(a.id, "current");
          currentSeen = true;
        } else {
          stationStatusById.set(a.id, "locked");
        }
      }
    }
  }

  const journeyModules: JourneyModule[] = moduleRows.map((m) => {
    const moduleSections = sectionsByModule.get(m.id) ?? [];
    const stations: Station[] = [];
    const sectionBreaks: SectionBreak[] = [];
    let lastStationId: string | null = null;

    for (let si = 0; si < moduleSections.length; si++) {
      const s = moduleSections[si];
      const moduleActivities = activitiesBySection.get(s.id) ?? [];
      if (si > 0 && lastStationId && moduleActivities.length > 0) {
        sectionBreaks.push({ afterId: lastStationId, label: s.title });
      }
      for (const a of moduleActivities) {
        const status = stationStatusById.get(a.id) ?? "locked";
        stations.push({
          id: a.id,
          label: a.title,
          status,
          type: a.type as ActivityType,
          href:
            status === "locked"
              ? undefined
              : `/courses/${courseId}/activities/${a.id}`,
          assessments: assessmentsByActivity.get(a.id) ?? [],
        });
        lastStationId = a.id;
      }
    }

    const total = stations.length;
    const completed = stations.filter((s) => s.status === "done").length;
    const status: ModuleStatus =
      total === 0
        ? "not_started"
        : completed === 0
          ? "not_started"
          : completed === total
            ? "completed"
            : "in_progress";

    return {
      id: m.id,
      title: m.title,
      order: m.order,
      status,
      stations,
      sectionBreaks,
      showComingSoon: total === COMING_SOON_THRESHOLD,
      totalActivities: total,
      completedActivities: completed,
    };
  });

  const totalActivities = journeyModules.reduce((acc, m) => acc + m.totalActivities, 0);
  const completedActivities = journeyModules.reduce(
    (acc, m) => acc + m.completedActivities,
    0
  );

  return { courseId, modules: journeyModules, totalActivities, completedActivities };
}
