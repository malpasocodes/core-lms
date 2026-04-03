# CoreLMS Demonstration Project

## Phase 2 — Execution Plan
**Phase Name:** Global Layout, Navigation, and Route Structure  
**Purpose:** Establish a coherent application shell and navigational structure so the system feels like a real product while still containing minimal domain logic.

Phase 2 deepens the **UI skeleton** and begins to clarify how users move through the system. Backend work remains light and strictly in service of visible UX.

---

## 1. Phase 2 Objectives

By the end of Phase 2, the system should:

- Have a stable global layout used across all pages
- Provide clear navigation between major sections
- Establish the canonical route structure for the LMS
- Feel like a real, navigable application rather than a placeholder

---

## 2. Scope Boundaries

### Included
- Global layout refinement
- Top-level navigation
- Route scaffolding for core areas
- Placeholder pages with explanatory copy

### Explicitly Excluded
- Authentication enforcement
- Role-based behavior
- Persistent domain data (courses, enrollments)

---

## 3. Route Structure (Established in This Phase)

The following routes are introduced and stabilized:

```text
/
/dashboard
/courses
/courses/[courseId]
/auth/login
/auth/register
```

These routes may display placeholder content but should be real pages.

---

## 4. Step-by-Step Execution

### Step 1 — Refine Global Layout

**Actions:**
- Update `app/layout.tsx`
- Introduce a consistent page container

**UI Deliverable:**
- Application-wide header
- Clear visual hierarchy

**Notes:**
- Use shadcn layout primitives
- Keep styling neutral and minimal

---

### Step 2 — Top Navigation Bar

**Actions:**
- Implement navigation component in `components/layout/`

**Navigation Items:**
- Dashboard
- Courses
- Logout (placeholder)

**UI Deliverable:**
- Clickable navigation links
- Active route indication

**Integration Note:**
- Import the navigation component into `app/layout.tsx` so it renders in the shared header and can read the current route (e.g., via `usePathname`) for active link styling; this keeps the visual chrome consistent across pages.

---

### Step 3 — Dashboard Page Refinement

**Actions:**
- Update `app/dashboard/page.tsx`

**UI Deliverable:**
- Introductory text explaining dashboard purpose
- Placeholder sections:
  - "Your Courses"
  - "Instructor Tools" (text-only for now)

**Purpose:**
- Set expectations for future functionality

---

### Step 4 — Courses Index Page (Placeholder)

**Actions:**
- Implement `app/courses/page.tsx`

**UI Deliverable:**
- Static list or empty-state message
- Clear explanation: courses will appear here once created or enrolled

**Components:**
- Card
- Empty state message

---

### Step 5 — Course Detail Route Stub

**Actions:**
- Implement `app/courses/[courseId]/page.tsx`

**UI Deliverable:**
- Placeholder course overview
- Sections for:
  - Course description
  - Modules (empty)

**Purpose:**
- Establish course as the central workspace

---

### Step 6 — Auth Route Placeholders

**Actions:**
- Implement placeholder pages for:
  - `/auth/login`
  - `/auth/register`

**UI Deliverable:**
- Simple cards indicating upcoming functionality

**Note:**
- These will be fully implemented in Phase 3

---

### Step 7 — Navigation Smoke Test

**Actions:**
- Click through all routes locally and in production
- Verify no broken links or layout regressions

**Deliverable:**
- Stable navigation experience

**Production Verification:**
- Trigger a Vercel preview/deploy after merging Phase 2 commits so the navigation test also runs against the live URL that reuses the same `DATABASE_URL` and layout as local.

---

## 5. Validation Checklist

Phase 2 is complete when:

- [ ] Global layout applied consistently
- [ ] Navigation visible on all pages
- [ ] Dashboard page refined
- [ ] Courses index page exists
- [ ] Course detail route stub works
- [ ] Auth route placeholders exist
- [ ] No broken routes in production

---

## 6. Demo Narrative (Phase 2)

At the end of Phase 2, you should be able to say:

> “This is now a navigable LMS shell. You can see where everything lives, how users will move through the system, and how little surface area is actually required.”

This reinforces the argument that **most LMS complexity is not structural**.

---

## 7. Transition to Phase 3

Phase 2 prepares the ground for Phase 3 by:

- Locking in the application structure
- Making authentication flows visible
- Establishing courses as the central organizing unit

Phase 3 will introduce **real authentication and user identity**.

---

**End of Phase 2 Execution Plan**
