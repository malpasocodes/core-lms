# Changelog

## 2026-01-01

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

### Admin Roster Tabs
- Added role-based tabs (Learner/Instructor/Admin) to admin roster page
- Implemented URL-based tab navigation using query params
- Added user counts per role in tab labels
- Replaced role column with creation date in user list

### Grading System
- Added grades schema and UI for assignment submissions
- Instructors can now grade learner submissions (0-100 scale)
- Learners see their grades on assignment pages
