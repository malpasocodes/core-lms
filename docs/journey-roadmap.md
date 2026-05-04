# Learning Journey — Roadmap

Follow-up work after the initial journey rollout (commits through `9d0fa4f`, 2026-05-04). Companion to `learning-journey-ui-spec.md`.

Items are unordered — pick by impact, not the listed sequence. Effort estimates are rough; treat as small / medium / large rather than precise.

---

## 1. Auto-completion redirect on activity submit

**Status:** idea
**Effort:** small (single file)

When a learner finishes a Listen / Read activity (or saves Watch notes), redirect directly to the next station in journey order rather than back to the activity page. Pairs with the existing post-completion "Next →" banner.

- Touchpoints: `lib/progress-actions.ts` (`markActivityCompleteAction`), `lib/module-actions.ts` (`saveWatchNotesAndCompleteAction`).
- Use `getCourseJourney(courseId, userId)` to resolve the next station (cross-section, cross-module). Fall back to the current activity page if there's no next.
- **Open question:** should this be the default, or a toggle (a checkbox on the activity page)? Auto-advance is opinionated — some learners may want to review what they just did. Recommend default-on with no toggle for v1; revisit if learners complain.
- **Don't touch** assessment submits (MCQ/open-ended) — learners explicitly want to see their score before moving on.

## 2. Watch-notes AI score in the gradebook

**Status:** idea
**Effort:** medium

The watch-notes AI analysis (1–10 score, paragraph rationale) currently lives only on the per-activity instructor panel. Surface it as a column in `/courses/[courseId]/gradebook` for cross-roster visibility — was part of the original AI-analysis ask.

- Touchpoints: `app/courses/[courseId]/gradebook/page.tsx`, possibly `lib/journey.ts` if reusing.
- Decide framing: **"notes quality"** column distinct from the graded-assessment columns (the original framing was "engagement signal, not a grade") — render with a separate visual treatment so instructors don't read it as parity with assessment scores.
- Hover/expand to show the analysis text.
- Consider sorting: should the column be sortable independently of assessment columns? The current gradebook doesn't sort at all; this might motivate adding sortability across the table.

## 3. Course-level progress bar on the journey page header

**Status:** idea
**Effort:** small

Currently the journey page shows "X of Y activities complete" as a text line. Add a 0–100% slim progress bar (slate-100 track, emerald fill) below it for a glanceable sense of progress.

- Touchpoint: `app/courses/[courseId]/page.tsx` (learner branch header).
- Mirror the bar on the dashboard's per-course card too, since it's already showing the course-wide count.
- Already have `journey.totalActivities` and `journey.completedActivities` from `lib/journey.ts` — purely presentational.

## 4. Preview-as-learner extends to activity / assessment pages

**Status:** idea
**Effort:** medium

The `?preview=learner` flag on `/courses/[courseId]` only re-routes the course-page render. Clicking through to an activity or assessment drops the instructor back into their normal edit view. To preview an end-to-end learner flow, the param needs to propagate.

- Touchpoints: `app/courses/[courseId]/activities/[activityId]/page.tsx`, `app/courses/[courseId]/activities/[activityId]/assessments/[assessmentId]/page.tsx`, plus every `<Link>` inside the journey view that navigates downstream.
- Carry `preview=learner` in `searchParams` and append to outbound links. Decide what to do about the existing footer prev/next chips and the post-completion Next CTA — they should preserve the param too.
- Server actions inside preview (e.g., MCQ submit) should be disabled or no-op-ed — instructors shouldn't accidentally write completion/grade rows for themselves while previewing. Add a guard at the top of relevant actions.
- Banner copy on activity / assessment pages: same amber "Previewing as learner" style as the course page.

## 5. Smoke-test pass

**Status:** idea
**Effort:** small to medium (depends on coverage depth)

The journey rollout was built with build-passes-and-spot-checks rather than browser verification. A structured pass would catch visual regressions and edge cases.

Suggested checklist (manual, in dev):

- **Empty course:** instructor creates a course with no modules → learner enrolls → dashboard card and journey page both render the empty states cleanly.
- **Course with modules but no activities:** module status pill should read "Not started"; MetroLine should render the standalone "Coming soon" cap inside the module card.
- **Single-station module:** MetroLine should render one station + no track segments.
- **Long activity titles:** verify line-clamp / truncation in MetroLine labels and ModuleCard headers.
- **Many activities (10+):** check horizontal scroll in MetroLine; ensure the current station stays visible without manual scrolling on first load (potential improvement: auto-scroll into view).
- **Section breaks:** module spanning multiple sections should show the section label above the track between two stations — verify positioning and label readability on narrow widths.
- **Status transitions:** complete an activity, refresh the journey page → verify the station turns purple, the next station gains the pulsing emerald ring, the course-level "Continue" hero updates to point at the new current.
- **Final activity:** complete the very last activity → verify the journey page hero switches to "Course complete" (purple), and the dashboard card chip switches to "All complete".
- **Preview as learner:** instructor toggles preview → verifies all stations look "locked" except the first → confirms Exit preview works.
- **Mobile:** journey page on a 375px-wide viewport — verify MetroLine scrolls, hero stacks, module cards readable.
- **Reduced motion:** macOS / iOS "Reduce motion" → verify the pulsing emerald ring is replaced by a static highlight (the `motion-safe:animate-ping` / `motion-reduce:` setup should already handle this, but worth confirming visually).

---

## Out of scope for the journey roadmap

These came up during discussion but are explicitly **not planned** under the journey umbrella:

- **Hard gating** of locked activities (blocking direct navigation). Decided against — see `learning-journey-ui-spec.md` "Interaction & State".
- **Programs** (top-level grouping above courses) and **Capstones** — not in CoreLMS schema.
- **Activity types beyond `watch | listen | read | write`** (checklists, image uploads, infographics from the original spec) — out of scope.
- **Threaded discussion / AI dialogue assessments** — separate infrastructure.
- **Earned badges, pitch decks, artifact responses, workbench** — separate dashboard-level features, not journey navigation.

These belong in a different roadmap if they ever get prioritized.
