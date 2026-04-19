# CoreLMS: Technical Implementation Reference

## Overview

CoreLMS is a full-stack Learning Management System built to demonstrate that the functional core of an enterprise LMS is a commodity — reproducible quickly with a small codebase and modern tooling. This document describes the technical architecture, data model, and implementation patterns for a developer audience.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.0.10 |
| Language | TypeScript | 5.x |
| UI | React | 19.x |
| Styling | Tailwind CSS v4 + shadcn/Radix UI | 4.x |
| Database | PostgreSQL via Neon (serverless HTTP) | — |
| ORM | Drizzle ORM | 0.38 |
| Auth | Clerk | 6.x |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) | 0.82 |
| File Storage | Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`) | AWS SDK v3 |
| Math Rendering | KaTeX | 0.16 |
| Icons | HugeIcons (`@hugeicons/react`) | 1.x |
| Deploy target | Netlify (via `@netlify/plugin-nextjs`) | — |

---

## Project Structure

```
app/                          # Next.js App Router pages
  layout.tsx                  # Root shell: SidebarNav + main content area
  dashboard/                  # Role-aware dashboard
  courses/
    [courseId]/               # Course detail (tabs: overview, modules, assignments, announcements)
      gradebook/              # Instructor/admin gradebook grid
      assignments/[id]/       # Assignment + submission + grading
      activities/[id]/        # Content item viewer
  admin/                      # Admin-only pages (roster, enroll, ingest, seed)
  instructor/enroll/          # Instructor enrollment management

components/
  layout/sidebar-nav.tsx      # Sticky sidebar with role-aware nav items
  ui/                         # shadcn/Radix component library

lib/
  schema.ts                   # Drizzle schema — all tables in one file
  db.ts                       # Neon client + Drizzle instance
  auth.ts                     # getCurrentUser(), requireRole() helpers
  user-sync.ts                # Clerk → local DB sync (ensureUserInDb)
  *-actions.ts                # Server Actions (one file per domain)
  r2.ts                       # Cloudflare R2 upload helpers

drizzle/                      # SQL migration files (0009_*.sql … 0019_*.sql)
scripts/
  db-migrate.ts               # Migration runner with _migrations tracking table
  db-seed.ts                  # Seed data

proxy.ts                      # Clerk middleware (renamed from middleware.ts for Next.js 16)
```

---

## Architecture Decisions

### App Router + Server Actions, No REST API

All mutations are implemented as Next.js Server Actions (`"use server"` functions in `lib/*-actions.ts`). There are no API routes (`/api/...`). This means:

- No serialization layer between server and client
- Form submissions call actions directly via the `action` prop
- Auth checks happen in the action itself, server-side
- All redirects are issued from the server; the client never decides where to go next

The pattern throughout is: validate → auth check → DB mutation → `redirect()`. Actions never return data to the client; they always end with a redirect to a URL with `?notice=` or `?error=` query params for feedback.

### Server Components by Default

Pages are async Server Components. Data is fetched directly in the page file with Drizzle queries — no `useEffect`, no client-side data fetching, no loading states for the primary data. Client components (`"use client"`) are used only where interactivity requires it: the sidebar nav (uses `usePathname`), the course tabs component (uses `useSearchParams`), and any form that needs `useTransition`.

### Dual Auth/DB Pattern (Clerk + Local Users Table)

Clerk manages authentication (sessions, OAuth, email/password, MFA). The local `users` table exists solely to satisfy foreign key constraints in the domain schema — every `enrollments`, `submissions`, `grades`, and `completions` row references `users.id`.

The `ensureUserInDb()` function (called from any Server Action that writes a user-owned record) upserts the current Clerk user into the local table using the Clerk user ID as the primary key. This means the local table is always a subset of Clerk's user list, kept in sync on demand rather than via webhooks.

Roles (`learner`, `instructor`, `admin`) are stored in Clerk's `publicMetadata.role`, not in the local `users` table (though the local table also has a role column kept in sync). The source of truth for roles is Clerk.

---

## Database Schema

All tables are defined in `lib/schema.ts` using Drizzle's typed schema builder. Migrations are plain SQL files in `drizzle/`.

### Tables

#### `users`
Local mirror of Clerk users. `id` is the Clerk user ID (text, not UUID).
```
id          text PK         — Clerk user ID
email       text UNIQUE
password_hash text          — always "CLERK_MANAGED"
role        user_role enum  — learner | instructor | admin
created_at  timestamptz
```

#### `courses`
```
id              text PK (UUID)
title           text
description     text nullable
instructor_id   text FK → users.id CASCADE
published       text enum "true"|"false"   — text enum, not boolean
source_metadata text nullable              — JSON blob from bulk import
created_at      timestamptz
```

#### `modules`
```
id          text PK
course_id   text FK → courses.id CASCADE
title       text
order       integer
source_ref  text nullable
created_at  timestamptz
```

#### `sections`
```
id          text PK
module_id   text FK → modules.id CASCADE
title       text
order       integer
source_ref  text nullable
created_at  timestamptz
```

#### `content_items`
Content lives at the section level. The `type` enum determines how the item is rendered.
```
id              text PK
section_id      text FK → sections.id CASCADE
type            content_type enum
title           text
content         text        — primary payload (URL for media, body for text)
content_payload text nullable — secondary payload (YouTube ID, char limits JSON, etc.)
source_ref      text nullable
order           integer
created_at      timestamptz
```

**`content_type` enum values:** `page`, `link`, `normalized_text`, `pdf`, `markdown`, `watch`, `listen`, `read`, `write`

#### `enrollments`
```
id          text PK
user_id     text FK → users.id CASCADE
course_id   text FK → courses.id CASCADE
enrolled_at timestamptz
UNIQUE (user_id, course_id)
```

#### `assignments`
```
id                    text PK
course_id             text FK → courses.id CASCADE
section_id            text FK → sections.id SET NULL nullable
title                 text
description           text nullable
type                  text "open_ended"|"mcq"
source_content_item_id text FK → content_items.id SET NULL nullable
linked_activity_id    text FK → content_items.id SET NULL nullable
mcq_model             text nullable    — model name used for AI generation
due_at                timestamptz nullable
created_at            timestamptz
```

#### `mcq_questions`
```
id              text PK
assignment_id   text FK → assignments.id CASCADE
order           integer
question_text   text
options         text    — JSON array of 4 strings
correct_index   integer — 0-3
explanation     text nullable
created_at      timestamptz
```

#### `submissions`
```
id              text PK
assignment_id   text FK → assignments.id CASCADE
user_id         text FK → users.id CASCADE
submission_text text nullable
file_url        text nullable
mcq_answers     text nullable   — JSON object {questionId: chosenIndex}
submitted_at    timestamptz
UNIQUE (assignment_id, user_id)   — one submission per learner per assignment
```

Upsert on `(assignment_id, user_id)` allows learners to update ungraded submissions.

#### `grades`
```
id            text PK
submission_id text FK → submissions.id CASCADE
score         integer     — 0–100
graded_by     text FK → users.id CASCADE nullable
graded_at     timestamptz
UNIQUE (submission_id)    — one grade per submission, immutable after creation
```

#### `completions`
```
id              text PK
user_id         text FK → users.id CASCADE
content_item_id text FK → content_items.id CASCADE
completed_at    timestamptz
UNIQUE (user_id, content_item_id)
```

#### `announcements`
```
id          text PK
course_id   text FK → courses.id CASCADE
author_id   text FK → users.id CASCADE
body        text
created_at  timestamptz
```

---

## Authentication and Authorization

### Middleware (`proxy.ts`)

Next.js 16 renamed `middleware.ts` to `proxy.ts`. The Clerk middleware runs on every non-static request:

1. Public routes (`/`, `/sign-in/*`, `/sign-up/*`) pass through immediately.
2. All other routes call `auth.protect()`, which redirects unauthenticated users to `/sign-in`.
3. Authenticated users on protected routes (except `/pending-approval`) trigger a `clerkClient().users.getUser(userId)` call to read `publicMetadata`. Users without `approved: true` (or a pre-existing role, for grandfathered accounts) are redirected to `/pending-approval`.

**Performance note:** The `clerkClient().users.getUser()` call in middleware is a network round-trip to Clerk's API on every protected request. This adds ~100–200ms of latency. The correct long-term fix is to include `approved` and `role` in the Clerk session token via a JWT template, making them available locally without a network call.

### Server-Side Auth Helpers (`lib/auth.ts`)

```typescript
getCurrentUser()    // returns { id, email, role } | null — never redirects
requireUser()       // redirects to /sign-in if not authenticated
requireAdmin()      // redirects to /dashboard if role !== admin
requireInstructor() // redirects to /dashboard if role !== instructor
requireLearner()    // redirects to /dashboard if role !== learner
```

These call Clerk's `currentUser()`, which uses React's `cache()` internally — multiple calls within the same request are deduplicated to a single Clerk API call.

### Authorization Pattern in Actions

Every Server Action performs its own auth check:

```typescript
const user = await getCurrentUser();
if (!user) redirect("/sign-in");

const course = await db.query.courses.findFirst(...);
const isOwner = user.role === "instructor" && user.id === course.instructorId;
const isAdmin = user.role === "admin";
if (!isOwner && !isAdmin) redirect(`/courses/${courseId}?error=Not%20authorized`);
```

There is no middleware-level resource authorization — all resource-level checks are in the actions.

---

## Database Layer (`lib/db.ts`)

Neon's serverless driver sends SQL over HTTP rather than maintaining a persistent TCP connection — appropriate for serverless/edge deployments where connection pooling is unavailable.

```typescript
const neonClient = neon(process.env.DATABASE_URL!);
const drizzleDb = drizzle(neonClient, { schema });
```

The Drizzle instance is a module-level singleton. `getDb()` returns it or throws if `DATABASE_URL` is not set, allowing early failure in misconfigured environments.

Queries use Drizzle's query builder for simple lookups (`db.query.courses.findFirst(...)`) and the select builder for joins:

```typescript
await db
  .select({ score: grades.score, email: users.email })
  .from(submissions)
  .leftJoin(grades, eq(grades.submissionId, submissions.id))
  .leftJoin(users, eq(submissions.userId, users.id))
  .where(inArray(submissions.assignmentId, assignmentIds));
```

---

## File Storage (`lib/r2.ts`)

PDFs, audio files, and markdown documents are uploaded to Cloudflare R2 using the AWS SDK v3 (`@aws-sdk/client-s3`). R2 exposes an S3-compatible API.

```typescript
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
```

Files are stored with a UUID key and served from a public R2 bucket URL (`NEXT_PUBLIC_R2_PUBLIC_URL`). The stored URL is written to `content_items.content`. No signed URLs are used — the bucket is publicly readable.

Upload limits enforced in the Server Action before sending to R2:
- PDFs and markdown: 20 MB
- Audio (MP3, M4A, WAV, OGG, WebM): 100 MB

---

## AI Integration — MCQ Generation (`lib/mcq-actions.ts`)

The `generateMcqFromPdfAction` Server Action generates a complete graded quiz from a PDF content item using Claude's native document API.

### Flow

1. **Fetch PDF** — retrieve the stored R2 URL from `content_items.content`, fetch the bytes, base64-encode them.
2. **Claude API call** — send the PDF as a `document` content block alongside a structured prompt requesting a JSON array of question objects.
3. **Parse response** — strip any markdown fencing, `JSON.parse()` the response, validate it is a non-empty array.
4. **Persist** — insert one `assignments` row (type `"mcq"`) and N `mcq_questions` rows in the same transaction-like sequence.
5. **Redirect** — to the new assignment page.

### Prompt Design

```
Generate exactly N multiple-choice questions based on the content of this PDF document.
Return ONLY a JSON array with no markdown fencing or extra commentary. Each element must have:
- "question": string
- "options": array of exactly 4 strings
- "correctIndex": integer 0-3
- "explanation": string
```

Structured output is enforced by prompt instruction rather than tool use or JSON mode. The response is defensively parsed — a failed parse redirects with an error rather than throwing.

### Configuration

- Model: `process.env.MCQ_MODEL ?? "claude-sonnet-4-6"` — operator-configurable without code changes.
- Question count: 3–20, passed as form input, clamped server-side.
- `max_tokens: 4096` — sufficient for 20 questions with explanations.
- The model name is written to `assignments.mcq_model` for attribution and audit.

---

## MCQ Grading (`lib/mcq-submit-actions.ts`)

MCQ answers are submitted as a flat form with one radio input per question named `answer_<questionId>`. The action:

1. Reads all `answer_*` fields from `FormData`.
2. Loads the `mcqQuestions` for the assignment.
3. Computes score: `Math.round((correct / total) * 100)`.
4. Upserts the submission (JSON-serialized answer map keyed by question ID).
5. Inserts a grade row immediately (auto-grading is synchronous).

The answer map `{ [questionId]: chosenIndex }` is stored as JSON in `submissions.mcq_answers`, allowing the UI to reconstruct which option the learner chose and display per-question feedback (correct/incorrect/explanation) after submission.

---

## Progress Tracking

Completion is recorded per content item per user in the `completions` table via `markCompleteAction` in `lib/progress-actions.ts`. The action checks enrollment before inserting, and uses `ON CONFLICT DO NOTHING` to make repeated calls idempotent.

Progress is computed entirely in the course page Server Component — no separate API call:

```typescript
// Course-level
const courseItemTotal = itemRows.length;
const courseItemCompleted = learnerCompletionSet.size;

// Module-level
const moduleProgressMap = new Map(
  moduleRows.map((mod) => {
    const modItems = sections.flatMap(s => itemsBySection[s.id]);
    const completed = modItems.filter(item => learnerCompletionSet.has(item.id)).length;
    return [mod.id, { total: modItems.length, completed }];
  })
);
```

`learnerCompletionSet` is a `Set<string>` of completed item IDs for the current user, built from a single `SELECT content_item_id FROM completions WHERE user_id = ? AND content_item_id IN (?)` query. All progress calculations are O(n) in JavaScript over the already-fetched data.

---

## Gradebook (`app/courses/[courseId]/gradebook/page.tsx`)

The gradebook page fetches three result sets and assembles a matrix client-side (in the Server Component):

1. **Assignment list** — ordered by `created_at`
2. **Enrolled learners** — `enrollments INNER JOIN users`, ordered by email
3. **Submission+grade data** — `submissions LEFT JOIN grades` for all assignment IDs

The cell map is keyed by `${userId}-${assignmentId}` → `{ submittedAt, score }`:

```typescript
const cellMap = new Map<string, { submittedAt: Date; score: number | null }>();
for (const row of rows) {
  cellMap.set(`${row.userId}-${row.assignmentId}`, { ... });
}
```

Column averages and row averages are computed by filtering `cellMap` values where `score !== null`. The table is rendered as a plain HTML `<table>` with the first column sticky (`position: sticky; left: 0`) for horizontal scrollability on narrow viewports.

---

## Announcements

The `announcements` table is a simple append-only message board scoped to a course. The Server Actions (`lib/announcement-actions.ts`) share an `assertCanPost()` helper that verifies the current user is the course owner or an admin — keeping auth logic out of the page and DRY across create and delete.

Announcements are fetched with a `LEFT JOIN users` to get the author's email without a second query, ordered `DESC` by `created_at` so the newest post appears first. There is intentionally no edit action — instructors delete and repost.

---

## Migration System (`scripts/db-migrate.ts`)

The custom migration runner reads SQL files from `drizzle/` in lexicographic order. A `_migrations` table tracks which files have been applied:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  name text PRIMARY KEY,
  applied_at timestamptz DEFAULT now() NOT NULL
)
```

On each run, already-applied file names are loaded into a `Set` and skipped. New files are applied statement-by-statement (split on `;\n`) and recorded. This replaces an earlier naive runner that re-executed all files every run, causing `column already exists` errors.

The runner is invoked with env vars loaded:
```bash
export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/db-migrate.ts
```

---

## Routing and Navigation

### Sidebar Layout

The root `app/layout.tsx` is a two-column flex shell: a `w-56` sticky `SidebarNav` on the left and a scrollable `<main>` on the right. The sidebar is a Server Component that receives `user` (fetched via `currentUser()` from Clerk) and passes it to the `SidebarNav` client component.

Nav items are role-aware: learners and instructors see Dashboard and Courses; admins additionally see Roster and Admin. The active item is highlighted with `bg-teal-50 text-teal-700` using `usePathname()`.

### Course Tabs

The course detail page (`/courses/[courseId]`) renders its content based on a `?tab=` query parameter. Tabs are rendered by the `CourseTabs` client component, which reads `useSearchParams()` and `usePathname()` to determine the active tab. The Gradebook tab links to a separate route (`/courses/[courseId]/gradebook`) rather than a query param, so `usePathname().endsWith("/gradebook")` detects its active state.

---

## Content Rendering

The activity viewer (`app/courses/[courseId]/activities/[activityId]/page.tsx`) branches on `contentItems.type`:

| Type | Renderer |
|---|---|
| `watch` | YouTube `<iframe>` with extracted video ID |
| `listen` | HTML5 `<audio>` element with R2 URL |
| `read` | PDF: `<iframe src={url}>` or Markdown: `<ReactMarkdown>` with remark-gfm + remark-math + rehype-katex |
| `write` | Textarea form wired to a write submission action |
| `pdf` | `<iframe>` |
| `markdown` | `<ReactMarkdown>` |
| `page` | Rendered text with KaTeX math support |
| `link` | Redirect or embedded iframe |

KaTeX math rendering (`$...$` inline, `$$...$$` display) is supported across all text-based content types via the `remark-math` + `rehype-katex` plugin chain and the KaTeX CSS import in `globals.css`.

---

## Environment Variables

```
DATABASE_URL                  Neon PostgreSQL connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLOUDFLARE_ACCOUNT_ID         R2 account
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
NEXT_PUBLIC_R2_PUBLIC_URL     Public base URL for stored files
ANTHROPIC_API_KEY
MCQ_MODEL                     Optional override, default "claude-sonnet-4-6"
```

---

## Known Limitations and Future Work

**Middleware latency.** The `clerkClient().users.getUser()` call in `proxy.ts` adds a Clerk API round-trip on every protected request. Fix: configure a Clerk JWT template to embed `role` and `approved` in the session token and read them from `auth().sessionClaims` instead.

**No connection pooling.** Neon's HTTP driver works well for low-to-medium concurrency. Under sustained high load, PgBouncer or Neon's own connection pooler should be enabled.

**File storage is public.** R2 objects are served from a public bucket. For any content that should be access-controlled, signed URLs with short TTLs would be required.

**No email notifications.** `svix` is installed (for Clerk webhook verification) but outbound email is not implemented. Announcement posts and grade notifications are not emailed to learners.

**Discussion threads not yet implemented** (Priority 5 in the improvement plan). Would require two new tables (`threads`, `thread_posts`) and per-section UI.

**MCQ structured output.** Response parsing uses `JSON.parse()` with markdown-fence stripping. Claude's tool use API or explicit JSON mode would be more robust for production use.
