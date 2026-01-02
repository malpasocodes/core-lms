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
- **Database:** PostgreSQL on Neon with Drizzle ORM
- **Styling:** Tailwind CSS 4, Radix UI, shadcn components
- **Auth:** Custom session-based auth with bcrypt, HTTP-only cookies

### Key Directories
- `app/` - Next.js pages using App Router (file-based routing)
- `lib/` - Server-side logic: auth, database, server actions
- `components/ui/` - Reusable UI components (shadcn-based)
- `drizzle/` - SQL migration files

### Server Actions Pattern
All mutations use Server Actions (no REST API). Pattern:
```typescript
"use server"
export async function actionName(formData: FormData) {
  const user = await requireUser();  // Auth check
  // Database operations with Drizzle
  redirect("/path?notice=success");  // Always redirect
}
```

### Database Schema (`lib/schema.ts`)
Core tables: `users`, `sessions`, `courses`, `modules`, `contentItems`, `enrollments`, `assignments`, `submissions`, `grades`, `completions`

### Authentication (`lib/auth.ts`)
- Three roles: `learner`, `instructor`, `admin`
- Helper functions: `getCurrentUser()`, `requireUser()`, `requireAdmin()`, `requireInstructor()`, `requireLearner()`
- Sessions stored in DB with 7-day TTL

### Route Structure
- `/auth/login`, `/auth/register` - Authentication
- `/dashboard` - User dashboard (role-specific)
- `/courses`, `/courses/[courseId]` - Course management
- `/admin/*` - Admin pages (roster, enrollment, seeding)

### UI Components (`components/ui/`)
All form elements use shadcn/ui components for consistency:
- `Input`, `Textarea`, `Label`, `Button`, `Checkbox` - Form elements
- `Card`, `Badge`, `Separator` - Layout/display
- `AlertDialog` - Delete confirmations
- `Tabs` - Tabbed interfaces
- Native `<select>` with consistent styling for form submission compatibility

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

Requires `DATABASE_URL` env var pointing to Neon PostgreSQL.

## Patterns

- All form submissions use `redirect()` for navigation
- Query params for messages: `?error=` or `?notice=`
- Server Components by default; mutations via Server Actions
- Use `cn()` from `lib/utils.ts` for Tailwind class merging
