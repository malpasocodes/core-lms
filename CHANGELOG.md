# Changelog

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
