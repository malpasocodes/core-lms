# CoreLMS Demonstration Project

## Phase 4 — Execution Plan
**Phase Name:** Role‑Aware Dashboards & Course Ownership  
**Purpose:** Introduce courses as first‑class objects and differentiate the system experience by role (Learner, Instructor, Administrator) without adding pedagogical or organizational complexity.

Phase 4 is where the LMS becomes recognizably an LMS: users see *their* courses, grounded in identity and role.

---

## 1. Phase 4 Objectives

By the end of Phase 4, the system should:

- Support creation of courses by instructors
- Persist courses in the database
- Display role‑appropriate dashboards:
  - Learners see enrolled courses (empty for now)
  - Instructors see owned courses
  - Administrators see all courses (read‑only)
- Establish the course as the central organizing unit

---

## 2. Scope Boundaries

### Included
- Course data model
- Course creation (instructor)
- Course listing by role
- Role‑aware dashboard behavior

### Explicitly Excluded
- Enrollment logic (Phase 5)
- Course content (modules, items)
- Editing or deleting courses
- Program‑level groupings

---

## 3. Data Model Introduced in This Phase

### 3.1 Course Table

Fields:
- `id`
- `title`
- `description`
- `instructor_id`
- `published` (boolean)
- `created_at`

Constraints:
- One instructor per course
- Courses are owned by instructors

---

## 4. Step‑by‑Step Execution

### Step 1 — Course Schema & Migration

**Actions:**
- Define `courses` table in `db/schema.ts` (UUID id, published defaults to false)
- Generate and apply migration (Drizzle) locally and before Vercel deploy

**Deliverable:**
- Courses table exists in Neon Postgres

---

### Step 2 — Course Creation Server Action

**Actions:**
- Implement `createCourse()` server action
- Restrict to instructors (`requireInstructor()`)

**Backend Deliverable:**
- Persisted course records

---

### Step 3 — Course Creation UI (Instructor)

**Actions:**
- Add "Create Course" button to instructor dashboard (no global nav link yet)
- Implement course creation form (title, description, published toggle)

**UI Deliverable:**
- Instructor can create a course end‑to‑end

---

### Step 4 — Instructor Dashboard: Owned Courses

**Actions:**
- Query courses by `instructor_id`
- Render list on dashboard (requireInstructor guard)

**UI Deliverable:**
- Instructor sees list of owned courses
- Each course links to `/courses/[courseId]`

---

### Step 5 — Learner Dashboard: Enrolled Courses (Empty State)

**Actions:**
- Render enrolled courses section
- Display empty state message

**UI Deliverable:**
- Learner dashboard shows "No enrolled courses yet"

---

### Step 6 — Administrator Dashboard: All Courses

**Actions:**
- Query all courses
- Render read‑only list
- Require admin role (`requireAdmin()`)

**UI Deliverable:**
- Admin sees system‑wide course list

Constraints:
- No edit or delete actions

---

### Step 7 — Course Detail Page (Real Data)

**Actions:**
- Update `/courses/[courseId]` page
- Fetch and display real course data
- Allow read‑only access to non‑owners for now

**UI Deliverable:**
- Course title and description visible
- Placeholder sections for modules

---

## 5. Validation Checklist

Phase 4 is complete when:

- [ ] Instructors can create courses
- [ ] Courses persist in database
- [ ] Instructor dashboard lists owned courses
- [ ] Learner dashboard shows enrolled‑courses empty state
- [ ] Admin dashboard lists all courses
- [ ] Course detail page renders real data
- [ ] Course creation gated to instructors; admin list gated to admins

---

## 6. Demo Narrative (Phase 4)

At the end of Phase 4, you should be able to say:

> “Courses now exist as first‑class objects. Instructors create them, learners will enroll in them, and administrators can see the system at a glance. Everything else will happen inside courses.”

This is the moment where the LMS’s **core abstraction becomes visible**.

---

## 7. Architectural Notes

- Course ownership is enforced server‑side
- No cross‑course logic is introduced
- No program or pathway layer exists

This preserves the core LMS boundary.

---

## 8. Transition to Phase 5

Phase 4 enables Phase 5 by:

- Establishing courses
- Creating stable course identifiers
- Making course lists role‑aware

Phase 5 will introduce **enrollment**, connecting learners to courses.

---

**End of Phase 4 Execution Plan**
