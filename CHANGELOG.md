# Changelog

## 2026-05-01

### Admin Settings page with model selector
- New admin-only **Settings** entry in the left sidebar (`Configuration01Icon`) linking to `/admin/settings`
- Settings page exposes an "Active model" dropdown — current options: **Anthropic Claude Sonnet 4.6** and **Mistral Medium 3** (`mistral-medium-2505`)
- Selection persists in a new `app_settings` key/value table; defaults to Claude Sonnet 4.6 when unset
- MCQ generation reads the active model from settings and dispatches per provider — Anthropic uploads PDF as base64; Mistral references the PDF via public R2 URL using `document_url` chunks
- Adds `@mistralai/mistralai` SDK dependency; new `MISTRAL_API_KEY` env var required when Mistral is selected

**Files created:**
- `drizzle/0003_smart_loa.sql`
- `drizzle/meta/0003_snapshot.json`
- `lib/settings.ts` — model registry + `getActiveModel()`
- `lib/settings-actions.ts` — `setActiveModelAction` server action
- `app/admin/settings/page.tsx`

**Files modified:**
- `lib/schema.ts` — adds `app_settings` table
- `lib/mcq-actions.ts` — provider dispatch (`generateWithAnthropic` / `generateWithMistral`), shared prompt + parser
- `components/layout/sidebar-nav.tsx` — Settings entry for admins
- `package.json` — `@mistralai/mistralai` dependency

### Activities & Assessments Overhaul
- Replaced `content_items` and `assignments` with a cleaner two-tier model: **activities** (Watch / Listen / Read / Write) inside sections, with **assessments** (open_ended or mcq, formative by default) attached per activity
- Boolean per-activity completion (`completions`) — Watch/Listen/Read complete via "Mark complete"; Write completes when the learner submits the prompt response
- Write activities auto-create a built-in `open_ended` assessment as their canonical submission target so the inline submit form rides the same `submissions` path; the built-in is hidden from "other assessments" listings
- Assessments support `graded` (default `false`), optional `dueAt`, ordered per activity; gradebook now filters to graded assessments only
- New `/courses/[courseId]/activities/[activityId]/assessments/[assessmentId]` route replaces `/assignments/[assignmentId]`
- Course page **Assessments** tab replaces the old **Assignments** tab; overview card lists assessments grouped by activity
- Destructive `0002_activities_and_assessments` migration drops the old tables/enum and creates the new shape (no data migration)
- Vestigial migration files (`0009`–`0020`) and `scripts/mark-migrations.ts` removed; consolidated baseline is `0001` + `0002`

**Files created:**
- `drizzle/0002_activities_and_assessments.sql`
- `drizzle/meta/0002_snapshot.json`
- `lib/assessment-actions.ts`
- `app/courses/[courseId]/activities/[activityId]/assessments/[assessmentId]/page.tsx`

**Files modified:**
- `lib/schema.ts` — `activities` + `assessments` tables, `activity_type`/`assessment_type` enums, `submissions.assessmentId`, `completions.activityId`, `mcqQuestions.assessmentId`, unique indexes
- `lib/module-actions.ts` — drops content-item CRUD; `createWriteActivityAction` auto-creates built-in assessment; `submitWriteActivityAction` writes to `submissions` + `completions`; `updateReadMarkdownActivityAction` added; `deleteActivityAction` replaces `deleteContentItemAction`
- `lib/mcq-actions.ts`, `lib/mcq-submit-actions.ts`, `lib/progress-actions.ts`, `lib/ingest-actions.ts`, `lib/openstax-actions.ts` — re-keyed to activities/assessments
- `app/courses/[courseId]/page.tsx` — Assessments tab + card, drops Assignments tab/forms
- `app/courses/[courseId]/_components/course-tabs.tsx` — `assessments` tab key
- `app/courses/[courseId]/gradebook/page.tsx` — joins assessments through activity → section → module, filters `graded = true`
- `app/courses/content/page.tsx`, `app/courses/content/_components/delete-content-form.tsx` — list/delete activities
- `app/api/upload-image/route.ts` — looks up activity, not contentItem
- `components/markdown-item-editor.tsx`, `components/html-item-editor.tsx` — form param renamed to `activityId`; markdown editor uses new dedicated action
- `scripts/ingest-finance.ts` — emits Read activities with `fileType: "normalized"` payload

**Files deleted:**
- `lib/assignment-actions.ts`
- `app/courses/[courseId]/assignments/[assignmentId]/page.tsx`
- `app/courses/[courseId]/items/[itemId]/page.tsx`
- `scripts/mark-migrations.ts`
- `drizzle/0009_phase9_grades.sql` through `drizzle/0020_add_openstax_tables.sql`

## 2026-04-20

### OpenStax Admin Nav Entry
- Added **OpenStax** link to the admin sidebar (between Roster and Admin) pointing to the existing `/admin/openstax` textbook ingestion page
- Uses the `BookDownloadIcon` from HugeIcons to signal "pull a textbook into the system"
- Visible only to admins — `adminItems` is gated on `user?.role === "admin"`

**Files modified:**
- `components/layout/sidebar-nav.tsx` — imported `BookDownloadIcon`, added OpenStax `NavItem`

### Image Upload for HTML Read Activities
- Instructors can now upload images directly into an HTML Read activity while editing — no need to host them externally
- New "Insert image" control in the edit pane accepts PNG or JPEG up to 5 MB; on upload, an `<img>` tag is inserted at the textarea cursor
- Uploads go through a new `/api/upload-image` route that auth-checks the user against the activity's course and stores files in R2 at `${courseId}/${sectionId}/${activityId}/images/${uuid}.${ext}`
- No page reload — in-progress edits to the HTML body are preserved across image uploads

**Files created:**
- `app/api/upload-image/route.ts`

**Files modified:**
- `components/html-item-editor.tsx` — added upload panel, cursor-aware insertion, inline error state

### Inline Editing of HTML Read Activities
- Instructors and admins can now edit an OpenStax-imported (html) Read activity directly from the activity page — Preview/Edit toggle mirrors the existing markdown Read editor
- Edit mode exposes the raw HTML in a textarea, so small fixes (e.g., removing broken `<img>` tags, fixing typos) no longer require a re-import
- Learners continue to see the read-only rendered view
- Save preserves `type: "read"` and `contentPayload.fileType: "html"` — only title and content are written back

**Files created:**
- `components/html-item-editor.tsx`

**Files modified:**
- `lib/module-actions.ts` — new `updateReadHtmlActivityAction` server action
- `app/courses/[courseId]/activities/[activityId]/page.tsx` — owner/admin branch renders `HtmlItemEditor`; learners keep the read-only render

### One-Click OpenStax Section Import as Read Activity
- Instructors can import the OpenStax section text linked to a course section directly as a Read activity — no download/upload round-trip required
- New `+ Import Read — from OpenStax` form appears next to `+ Read` in the module view, but only when the section has an OpenStax `sourceRef` from the structure-import flow
- Optional title override; defaults to the OpenStax section title
- Stored as a Read activity with `contentPayload.fileType = "html"` so the original OpenStax formatting (including math, figures, tables) is preserved
- Added a new `html` rendering branch to the activity viewer using `dangerouslySetInnerHTML` inside a `prose` wrapper (OpenStax HTML is trusted server-side content)

**Files created:**
- (none)

**Files modified:**
- `lib/openstax-actions.ts` — new `importOpenstaxSectionAsReadActivityAction` server action
- `app/courses/[courseId]/page.tsx` — added `+ Import Read — from OpenStax` form; included `sourceRef` in section query
- `app/courses/[courseId]/activities/[activityId]/page.tsx` — added `fileType === "html"` render branch

### Migration Baseline Consolidation
- New Drizzle-generated `0001_bored_grandmaster` migration that captures every schema change since `0000`: announcements, `mcq_questions`, OpenStax tables (`openstax_books`, `openstax_chapters`, `openstax_sections`), the `modules → sections` refactor, content_type enum additions (`pdf`, `markdown`, `watch`, `listen`, `read`, `write`), `assignments` columns (`section_id`, `type`, `source_content_item_id`, `linked_activity_id`, `mcq_model`, `due_at`), `submissions.mcq_answers`, and `content_items.section_id`
- Migration runner updated to split on Drizzle's native `--> statement-breakpoint` marker (required to parse 0001 correctly)
- New `scripts/mark-migrations.ts` one-off seeder inserts historical filenames into the `_migrations` tracking table so existing databases skip already-applied migrations on next run

**Files created:**
- `drizzle/0001_bored_grandmaster.sql`
- `drizzle/meta/0001_snapshot.json`
- `scripts/mark-migrations.ts`

**Files modified:**
- `scripts/db-migrate.ts` — split on `--> statement-breakpoint` instead of `;\s*\n`
- `drizzle/meta/_journal.json` — registered 0001

### Working-Tree Cleanup
- Added `/data/` to `.gitignore` so the 2.2MB `finance_normalized.json` ingestion source stays out of git
- Removed stray working-tree copies of files that were deleted in commit `f56c98d` but reappeared (iCloud-sync artifacts): `components/layout/primary-nav.tsx`, `app/dashboard/_components/course-form.tsx`, and a duplicate `data/APP_TEMPLATE.md` (the tracked `docs/APP_TEMPLATE.md` is unchanged)

**Files modified:**
- `.gitignore` — ignore `/data/`

**Files deleted (from working tree):**
- `app/dashboard/_components/course-form.tsx`
- `components/layout/primary-nav.tsx`
- `data/APP_TEMPLATE.md`

## 2026-04-02

### Production Go-Live on Netlify
- Site is live at https://corelms.org
- Clerk production instance configured with `corelms.org` domain

### Netlify Migration (from Vercel)
- Replaced `vercel.json` with `netlify.toml` (build config + `@netlify/plugin-nextjs`)
- Added `@netlify/plugin-nextjs` as a dev dependency
- Updated `.gitignore` to exclude `.netlify/`

**Files created:**
- `netlify.toml`

**Files deleted:**
- `vercel.json`

### Deployment Bug Fixes
- Added missing `dotenv` dependency (required by `scripts/ingest-finance.ts` at build time)
- Fixed stale `/auth/login` redirects → `/sign-in` across 8 pages left over from the Clerk migration

**Files modified:**
- `app/page.tsx`
- `app/admin/page.tsx`
- `app/admin/enroll/page.tsx`
- `app/courses/[courseId]/page.tsx`
- `app/courses/[courseId]/items/[itemId]/page.tsx`
- `app/courses/[courseId]/assignments/[assignmentId]/page.tsx`
- `app/courses/content/page.tsx`
- `app/courses/modules/page.tsx`

## 2026-01-18

### Course Content Ingestion System
- Added normalized content ingestion for importing structured course content from JSON
- New `contentPayload` column on content_items table stores block-level content as JSON
- New `normalized_text` content type for rich structured content
- Admin ingest page at `/admin/ingest` for pasting JSON content
- Normalized content renderer displays paragraphs, figures, tables, and other block types
- Added CLI script for bulk ingestion: `npx tsx scripts/ingest-finance.ts`

**Files created:**
- `app/admin/ingest/page.tsx` - Admin UI for JSON content ingestion
- `lib/ingest-actions.ts` - Server action for processing normalized JSON
- `components/normalized-content-renderer.tsx` - Renders normalized content blocks
- `scripts/ingest-finance.ts` - CLI script for ingesting finance course
- `drizzle/0011_add_content_payload.sql` - Migration for contentPayload column
- `docs/core_lms_ingestion_spec_modules_→_sections.md` - Ingestion format specification

**Schema changes:**
- Added `contentPayload` text column to `content_items` table
- Added `normalized_text` to `content_type` enum

## 2026-01-17

### Clerk Authentication Migration
- Migrated from custom session-based authentication to Clerk
- User roles stored in Clerk's `publicMetadata` (learner, instructor, admin)
- Authentication UI uses Clerk's built-in components (SignIn, SignUp, UserButton)
- Local users table retained for foreign key references (courses, enrollments, etc.)
- Added user sync utility to bridge Clerk users with local database

**Dependencies:**
- Added: `@clerk/nextjs`, `svix`
- Removed: `bcryptjs`, `@types/bcryptjs`

**Files created:**
- `proxy.ts` - Clerk middleware for route protection (Next.js 16 format)
- `lib/user-sync.ts` - Syncs Clerk users to local DB for foreign keys
- `app/sign-in/[[...sign-in]]/page.tsx` - Clerk sign-in page
- `app/sign-up/[[...sign-up]]/page.tsx` - Clerk sign-up page

**Files modified:**
- `lib/auth.ts` - Rewritten to use Clerk's `currentUser()`
- `lib/admin-actions.ts` - Uses Clerk Backend API for user management
- `app/layout.tsx` - Added ClerkProvider wrapper
- `components/layout/primary-nav.tsx` - Added UserButton, SignedIn/SignedOut
- `app/admin/roster/page.tsx` - Fetches users from Clerk API
- `app/admin/roster/_components/edit-user-button.tsx` - Changed to role editing
- `lib/schema.ts` - Removed sessions table
- `lib/seed.ts` - Marked as deprecated

**Files deleted:**
- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `app/logout/page.tsx`

**Environment variables required:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`

**Note:** To set the first admin, edit the user's publicMetadata in Clerk Dashboard: `{ "role": "admin" }`

## 2026-01-01

### Course Page Tab Navigation
- Organized course page into tab-based sections:
  - Overview: Course summary with module/assignment counts
  - Modules: Full module management with content items
  - Assignments: Assignment list and creation form
  - Create Module: Dedicated module creation section (instructors only)
- Added horizontal tab navigation for course pages
- URL-based navigation using query params (?tab=modules)

**Files created:**
- `app/courses/[courseId]/_components/course-tabs.tsx`

**Note:** Added shadcn/ui sidebar components (sidebar, sheet, tooltip, skeleton, use-mobile hook) for potential future use.

### shadcn/ui Full Refactor
- Standardized all UI components across the application using shadcn/ui
- Added Tabs and Checkbox components via `npx shadcn@latest add`
- Replaced raw HTML inputs, buttons, textareas with shadcn components (Input, Textarea, Label, Button)
- Created AlertDialog-based delete confirmations for:
  - Users (admin roster)
  - Courses
  - Modules
  - Content items
- Updated 12 page/component files with consistent form styling
- Added UI components documentation to CLAUDE.md
- Fixed missing `eq` import in `lib/assignment-actions.ts`

**Files created:**
- `components/ui/tabs.tsx`
- `components/ui/checkbox.tsx`
- `app/admin/roster/_components/delete-user-button.tsx`
- `app/courses/_components/delete-course-form.tsx`
- `app/courses/modules/_components/delete-module-form.tsx`
- `app/courses/content/_components/delete-content-form.tsx`

### Clean Up Course Detail Page
- Removed Completion summary section from course detail page
- Removed Enrolled learners section from course detail page
- Removed Enroll a learner form from course detail page
- Enrollment management should be handled elsewhere (admin)

### Simplify Admin Courses Page
- Removed Modules and Content tabs from admin courses page
- Deleted `/courses/modules` and `/courses/content` routes
- Instructors manage modules/content from within course detail pages only

**Files deleted:**
- `app/courses/modules/page.tsx`
- `app/courses/modules/_components/delete-module-form.tsx`
- `app/courses/content/page.tsx`
- `app/courses/content/_components/delete-content-form.tsx`

### Admin Roster Edit User
- Added Edit button alongside Delete button for each user
- Edit dialog shows user details (email, role, created date) as read-only
- Admins can change user passwords via the edit dialog
- Added Dialog component via `npx shadcn@latest add dialog`
- Added `updateUserPasswordAction` server action

**Files created:**
- `components/ui/dialog.tsx`
- `app/admin/roster/_components/edit-user-button.tsx`

### Admin Roster Tabs
- Added role-based tabs (Learner/Instructor/Admin) to admin roster page
- Implemented URL-based tab navigation using query params
- Added user counts per role in tab labels
- Replaced role column with creation date in user list

### Grading System
- Added grades schema and UI for assignment submissions
- Instructors can now grade learner submissions (0-100 scale)
- Learners see their grades on assignment pages
