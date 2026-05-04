# Learning Journey UI/UX Specification

A spec for adopting a hierarchical "learning journey" UI in **CoreLMS**. The visual hook is a **subway-style MetroLine** that shows learners where they are, what's done, and what's next — so they never have to ask "where am I in this course?"

This spec is scoped to CoreLMS as it stands today (`lib/schema.ts`, App Router routes, Clerk auth, Tailwind 4 + shadcn). It assumes the learner role; instructor/admin views are out of scope.

---

## Concept

Each course is a journey. The learner navigates a hierarchical curriculum and the UI keeps the journey visible at all times.

**Always show the map.** The learner should always be able to glance at a course and answer: *what have I done, where am I now, what's next, what's locked.*

## Information Architecture

CoreLMS hierarchy (from `lib/schema.ts`):

- **Course** — top-level enrollable unit (`courses`).
- **Module** — themed unit within a course; ordered (`modules.order`).
- **Section** — grouping within a module; ordered (`sections.order`).
- **Activity** — atomic unit of learning (`activities`); ordered within a section. Types: `watch`, `listen`, `read`, `write`.
- **Assessment** — attached to an activity (`assessments`). Types: `open_ended`, `mcq`. May be `graded` or formative.

> **Sections** are a real layer in CoreLMS but typically thin (a module has 1–3 sections). The Learning Journey treats sections as visual *grouping cues within a module's MetroLine* (e.g., a labeled track break) rather than as their own page.

### Out of scope (deliberately excluded)

- **Programs** (no top-level grouping above courses in CoreLMS).
- **Capstones** (no schema support).
- **Activity types** beyond the four enums (`watch`, `listen`, `read`, `write`) — no checklists, image/audio uploads, or infographics.
- **Assessment types** beyond `open_ended` and `mcq` — no threaded discussion or AI dialogue assessments.
- **Workbench / Badges** — could be added later but are not part of this spec.

## Routes

The spec aligns to CoreLMS's existing App Router structure. No new top-level routes are introduced.

| Surface | Route | Notes |
|---|---|---|
| Learner hub | `/dashboard` | Existing — adds journey-flavored cards |
| Course Journey | `/courses/[courseId]` | Role-branched: learners get the Journey view; instructors keep the curriculum/edit view |
| Activity detail | `/courses/[courseId]/activities/[activityId]` | Existing — re-skinned per this spec |
| Assessment detail | `/courses/[courseId]/activities/[activityId]/assessments/[assessmentId]` | Existing — re-skinned per this spec |

## Core Pages

### 1. Dashboard (`/dashboard`, learner branch)

Already exists with **Welcome** header + **Your courses** + **Profile** + **Announcements**. Adopting this spec means:

- **Your courses** card becomes the primary surface (largest, top of page) — each enrolled course renders as a horizontal card with the course title, instructor name, and a **mini MetroLine** showing the learner's progress through the course's first incomplete module. Clicking the card goes to `/courses/[courseId]`.
- **Profile** card: avatar, display name, editable bio fields (preferred name, timezone, location, LinkedIn, bio). Already wired to `userProfiles`.
- **Announcements**: latest 3 entries from `announcements` for any course the learner is enrolled in, plus a "View all" link. Replaces the current placeholder.

No badges, no startup profile, no pitch decks — those are out of scope.

### 2. Course Journey (`/courses/[courseId]`, learner branch)

Replaces the current learner view of a course. **Single-column** stack of **module cards**, each with:

- **Module header**: title + status pill (`Not started` / `In progress` / `Completed`).
- **MetroLine**: a horizontally scrollable timeline rendering the module's activities in order (sections-flattened, with optional small section labels above the line as track-break cues).
- A **dashed "Coming Soon"** placeholder caps modules whose author hasn't added all activities yet.

Instructors and admins continue to see the existing curriculum/edit view at the same URL — branch on `user.role` server-side. (Same pattern as `app/dashboard/page.tsx`.)

### 3. Activity Detail (`/courses/[courseId]/activities/[activityId]`)

Already exists. The skin updates to match the journey aesthetic:

- **Header**: small uppercase activity-type label (`WATCH`, `LISTEN`, `READ`, `WRITE`), title, "Back to course" link to `/courses/[courseId]`.
- **Activity body** renders by `activities.type`:
  - `watch` → existing YouTube embed (with the post-completion "no longer available" placeholder we already ship).
  - `listen` → existing audio player.
  - `read` → existing renderer (pdf / markdown / html / normalized blocks).
  - `write` → existing prompt + textarea via `WriteActivityClient`.
- **Submit** action: full-width emerald pill (or shadcn `Button` with `variant="default"` if we standardize on the theme — see *Visual System*).
- **Watch notes** block (already shipped) keeps its locked/unlocked states unchanged.

### 4. Assessment Detail (`/courses/[courseId]/activities/[activityId]/assessments/[assessmentId]`)

Already exists. Skin updates:

- **Header**: "Assessment" eyebrow + activity title + assessment type label (`Multiple choice` or `Open-ended`).
- **MCQ** (`type === "mcq"`): numbered question blocks on `slate-50`, radio options that highlight emerald on hover. After submission, per-question correct/incorrect feedback (already shipped).
- **Open-ended** (`type === "open_ended"`): 12-row textarea, emerald focus ring, live char counter against any min/max defined in `activities.contentPayload`.
- **If already submitted**: green banner with checkmark instead of the form (already partly shipped — keep consistent).

## MetroLine Component Spec

A **pure presentational** component. No data fetching, no router calls.

```ts
type Station = {
  id: string;                             // activity id
  label: string;                          // activity title
  status: "locked" | "current" | "done";
  type: "watch" | "listen" | "read" | "write";
  href?: string;                          // omitted when locked
  assessments?: Array<"mcq" | "open_ended">; // mini-badges below station
};

type MetroLineProps = {
  stations: Station[];
  showComingSoon?: boolean;               // dashed cap at the end
  sectionBreaks?: Array<{ afterId: string; label: string }>; // optional
};
```

### Visual rules

- **Stations** are circles (16px stroke-2). The **current** station gets a pulsing emerald ring (`animate-ping` wrapped in `motion-safe:`). **Done** stations are filled purple with a checkmark. **Locked** stations are slate, no fill.
- **Track segments** between stations: 2px line. Segments *behind* progress (between `done`/`current`) use a `from-purple-500 to-emerald-500` gradient. Segments *ahead* are `slate-200`.
- **Mini-badges below each station** for attached assessments: `K` (mcq, knowledge check) and `W` (open-ended, writing). Stack horizontally; max 2 visible, then `+N`.
- **Section breaks** render as a vertical 1px slate divider with a small uppercase label (`text-[10px] tracking-[0.2em]`) above the track.
- **Coming Soon** cap is a dashed circle in slate at the end with a small "Coming soon" label.
- The container is **horizontally scrollable** with overflow hidden vertically. Stations have a min spacing of 64px so a 6-activity module fits two at a time on mobile.

### Click behavior

- `done` and `current` stations are clickable links to their `href`.
- `locked` stations are visually muted and not clickable; `aria-disabled="true"`, no `href` rendered.

## Visual System

CoreLMS uses Tailwind 4 with shadcn theme tokens (`text-foreground`, `bg-card`, etc.) for layout surfaces. The journey introduces a **journey-specific palette** for status semantics, which sits *on top of* the theme tokens.

### Journey palette

- **Current**: `emerald-500/600` (foreground), `emerald-50` (subtle background)
- **Done**: `purple-500/600` (foreground), `purple-50` (subtle background)
- **Locked**: `slate-300/400` (foreground), `slate-50` (background)

**Emerald is the standard accent across CoreLMS going forward.** Existing teal touches (e.g., the active item in the instructor sidebar) are phased out as surfaces are re-skinned to match the journey aesthetic. Don't introduce new teal usages.

### Reusable Tailwind patterns

- **Card**: `rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm`
- **Primary action**: shadcn `Button` (default variant) — keep using `components/ui/button.tsx` for consistency. Reserve raw `bg-emerald-600 rounded-full` for the in-MetroLine submit affordance only.
- **Input focus**: `focus-visible:ring-emerald-300 focus-visible:ring-2`
- **Eyebrow label**: `text-xs uppercase tracking-[0.3em] text-muted-foreground`
- **Status pill**: shadcn `Badge` with `variant` chosen by status (`secondary` for done, `default`/custom for current, `outline` for locked).

## Interaction & State

- **Lifecycle**: each activity has a learner-relative status: `locked` / `current` / `done`. Computed server-side from `completions` (a row per `(userId, activityId)` indicates done) plus position within the module.
- **Current** = the first non-done activity in module order. Earlier modules' incomplete activities are still navigable (free-roam within already-unlocked modules); later modules start as locked.
- **Gating is visual-only.** Locked stations are unclickable in the MetroLine, but `/courses/[courseId]/activities/[activityId]` still loads if a learner navigates there directly. The MetroLine gives the orientation cue; the system doesn't punish self-directed learners or block review of completed material. Hard gating is not a planned feature.
- **Pulsing current station** uses `motion-safe:animate-ping` so users with `prefers-reduced-motion: reduce` don't see motion.
- **Completion banner**: after a learner completes an assessment, show a green confirmation banner (already partly shipped — keep consistent across all assessment types).
- **Live char counters** on every textarea, with submit disabled until min length met. (Already shipped on `WriteActivityClient` and `WatchNotesClient`.)
- **Always offer "Back to course"** from any leaf page.

## Accessibility

- **Color is never the only signal**: `done` stations also have a checkmark, `current` also has a ring, `locked` also has a muted/dashed style.
- **Animation respects `prefers-reduced-motion`** — wrap pulses in `motion-safe:` and provide a static highlight in `motion-reduce:`.
- **MetroLine** has `role="list"` with each station as `role="listitem"`. Locked stations are `aria-disabled="true"`. The current station has `aria-current="step"`.
- **Focus order** in the MetroLine follows visual order (left-to-right). Keyboard users can tab through stations; Enter activates the link.
- **Status pill** text is real text, not just color (`Not started` / `In progress` / `Completed`).
- **Color contrast**: emerald-500 on white passes AA for large text; for small text use emerald-700 or emerald-600. Test with the existing tailwind theme.

## Empty / Error / Loading States

- **Course with no modules**: the journey page shows a single empty card: "Your instructor hasn't added any modules yet."
- **Module with no activities**: the module card shows the dashed "Coming Soon" cap as its only content.
- **Mini MetroLine on dashboard with no progress**: every station shows as `locked` *except* the first, which becomes `current`.
- **Loading**: the page is a Server Component; render synchronously after the DB query. No spinner needed at the page level. For client components (e.g., MCQ submit), use `useFormStatus` (already in use).
- **Errors**: surface via the existing `?error=` / `?notice=` query-param banner pattern.

## Components to Build (in order)

CoreLMS conventions: **Server Components by default**, client islands only for interactivity (form state, char counters). Server Actions for mutations.

1. **`<MetroLine />`** — pure presentational, can be a Server Component (no client state). The differentiator; build it first against mocked station data.
2. **`<ModuleCard />`** — wraps `MetroLine` + module header + status pill; Server Component.
3. **`<MiniMetroLine />`** — compact variant for the dashboard "Your courses" card. Could share the same component with a `density="compact"` prop.
4. **`getCourseJourney(courseId, userId)`** — server-side helper in `lib/journey.ts` that returns `Module[]` with each module's stations, statuses, and assessment chips. Joins `modules → sections → activities → completions` and `assessments` in one query.
5. **Re-skin `app/courses/[courseId]/page.tsx`** for the learner branch to render `ModuleCard`s.
6. **Re-skin `app/dashboard/page.tsx`** "Your courses" card to use `MiniMetroLine`.
7. **Re-skin activity & assessment detail pages** with the new header/eyebrow + emerald accents. No structural change.

## Implementation Notes

- **Server Actions for all writes**: mutations (`completions`, `submissions`) already use this pattern — don't introduce REST endpoints.
- **Status computation lives in `lib/journey.ts`**, not in the React tree. Components receive precomputed `Station.status`.
- **Use `cn()`** from `lib/utils.ts` for conditional Tailwind classes.
- **Native `<select>`** in any new forms (per `CLAUDE.md`).
- **Don't reach for shadcn `Select`** for form submission contexts.
- **MetroLine's pulsing ring** must be in a client island only if it uses `useEffect` for any reason; pure CSS pulses can stay in a Server Component.

## Key Design Principles (kept from the original spec)

- **Always show the map** — every learner-facing surface gives orientation cues.
- **Single primary action per screen** in emerald.
- **Soft, generous whitespace** (`py-12+`, `gap-6`, `rounded-2xl`) — feels like a journal, not an LMS.
- **Status is color-coded consistently** (emerald = now, purple = done, slate = locked) across every surface — and never relies on color alone.
