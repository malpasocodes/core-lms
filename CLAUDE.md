# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoreLMS is a minimalist Learning Management System demonstrating that core LMS functionality is a commodity. Built with Next.js 16, React 19, TypeScript, Drizzle ORM, and PostgreSQL (Neon).

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply migrations to database
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 App Router with React 19 Server Components
- **Database:** PostgreSQL on Neon with Drizzle ORM (`@neondatabase/serverless`)
- **Styling:** Tailwind CSS 4, Radix UI, shadcn components
- **Auth:** Clerk (`@clerk/nextjs`) — roles stored in `user.publicMetadata.role`
- **Icons:** HugeIcons (`@hugeicons/react`)
- **Webhooks:** svix (for Clerk webhook verification)

### Key Directories
- `app/` - Next.js pages using App Router (file-based routing)
- `lib/` - Server-side logic: auth, database, server actions
- `components/ui/` - Reusable UI components (shadcn-based)
- `drizzle/` - SQL migration files
- `scripts/` - Database migration and ingestion scripts

### Authentication (`lib/auth.ts`)
Clerk-based. Roles (`learner`, `instructor`, `admin`) live in Clerk `publicMetadata.role`.

Helper functions:
- `getCurrentUser()` — returns `{ id, email, role }` or null
- `requireUser()` — redirects to `/sign-in` if unauthenticated
- `requireAdmin()`, `requireInstructor()`, `requireLearner()` — redirects to `/dashboard` if wrong role

**Middleware (`middleware.ts`):** Clerk middleware gates all routes. Public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)`. Users without an approved status are redirected to `/pending-approval` (checked via `publicMetadata.approved`). Existing users at migration time are grandfathered in.

### Database Schema (`lib/schema.ts`)
Core tables: `users`, `courses`, `modules`, `contentItems`, `enrollments`, `assignments`, `submissions`, `grades`, `completions`

- `contentItems.type` enum: `page`, `link`, `normalized_text`
- `users.role` enum: `learner`, `instructor`, `admin`
- No sessions table — Clerk handles sessions

### Server Actions Pattern
All mutations use Server Actions (no REST API):
```typescript
"use server"
export async function actionName(formData: FormData) {
  const user = await requireUser();  // Auth check
  // Database operations with Drizzle
  redirect("/path?notice=success");  // Always redirect
}
```

Server actions live in `lib/*-actions.ts` files (e.g., `course-actions.ts`, `enrollment-actions.ts`).

### Route Structure
- `/sign-in`, `/sign-up` — Clerk-managed auth pages
- `/pending-approval` — shown to users awaiting admin approval
- `/dashboard` — role-specific dashboard
- `/courses`, `/courses/[courseId]` — course browsing and detail
- `/courses/[courseId]/items/[itemId]` — content item viewer
- `/courses/[courseId]/assignments/[assignmentId]` — assignment detail
- `/admin/*` — admin pages: roster, enrollment, content ingestion, seeding

### UI Components (`components/ui/`)
All form elements use shadcn/ui for consistency. Use native `<select>` (not shadcn Select) for form submission compatibility.

Select styling pattern:
```tsx
className="flex h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px] dark:bg-input/30"
```

Delete confirmation pattern (client component):
```tsx
"use client";
<AlertDialog>
  <AlertDialogTrigger asChild><Button variant="destructive">Delete</Button></AlertDialogTrigger>
  <AlertDialogContent>
    <form action={deleteAction}>
      <AlertDialogAction type="submit" variant="destructive">Confirm</AlertDialogAction>
    </form>
  </AlertDialogContent>
</AlertDialog>
```

## Environment

Requires `DATABASE_URL` (Neon PostgreSQL) and Clerk env vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Patterns

- All form submissions use `redirect()` for navigation
- Query params for messages: `?error=` or `?notice=`
- Server Components by default; mutations via Server Actions
- Use `cn()` from `lib/utils.ts` for Tailwind class merging

## Workflows

### After every commit + push
Update `CHANGELOG.md` with a new entry summarizing what shipped. Follow the existing format:
- Group under a date heading (`## YYYY-MM-DD`) — add a new date heading if today's doesn't exist yet, otherwise append a new `###` subsection under the existing one
- `###` section title describing the feature/change
- Bullet list of what changed (user-facing + notable technical details)
- `**Files created:**` / `**Files modified:**` / `**Files deleted:**` lists as applicable
- Include schema changes, new env vars, or migration notes when relevant

Update the file only — leave it uncommitted unless the user asks to commit it. Do not amend the feature commit.
