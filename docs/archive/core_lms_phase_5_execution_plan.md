# CoreLMS Demonstration Project

## Phase 5 — Execution Plan
**Phase Name:** Enrollment (Connecting Learners to Courses)  
**Purpose:** Introduce enrollment as the final core structural primitive of the LMS, connecting learners to courses through an explicit, inspectable relationship.

Phase 5 completes the *structural core* of the LMS: users, courses, and enrollments.

---

## 1. Phase 5 Objectives

By the end of Phase 5, the system should:

- Support enrolling learners in courses
- Persist enrollments in the database
- Reflect enrollment state in learner dashboards
- Preserve strict role boundaries
- Keep enrollment logic simple and explicit

---

## 2. Scope Boundaries

### Included
- Enrollment data model
- Enrollment creation
- Enrollment-aware dashboards
- Basic access checks based on enrollment

### Explicitly Excluded
- Self-service course discovery
- Waitlists
- Approval workflows
- Drop / withdraw logic
- Enrollment limits or capacity
- Program-based enrollment

Enrollment is intentionally manual and minimal.

---

## 3. Data Model Introduced in This Phase

### 3.1 Enrollment Table

Fields:
- `id`
- `user_id` (learner)
- `course_id`
- `enrolled_at`

Constraints:
- Unique (`user_id`, `course_id`) pair
- Learners only (no instructors or admins)

---

## 4. Enrollment Semantics

- Enrollment is a **fact**, not a workflow
- An enrolled learner gains read access to a course
- Enrollment has no status beyond existence

There is no notion of:
- pending
- completed
- withdrawn

Those are downstream interpretations.

---

## 5. Step-by-Step Execution

### Step 1 — Enrollment Schema & Migration

**Actions:**
- Define `enrollments` table in `db/schema.ts`
- Add unique constraint on (`user_id`, `course_id`)
- Use UUID ids
- Generate and apply migration (run locally and before Vercel deploy)

**Deliverable:**
- Enrollment table exists in Neon Postgres

---

### Step 2 — Enrollment Server Action

**Actions:**
- Implement `enrollLearner()` server action
- Restrict to:
  - admin, or
  - instructor (for their own courses)

**Backend Deliverable:**
- Enrollment records persisted
- Friendly handling of duplicates (no crash)

---

### Step 3 — Enrollment UI (Admin / Instructor)

**Actions:**
- Add "Enroll Learner" form on course detail page (visible to instructor owner + admin)
- Simple form:
  - learner email (lookup user, must be role=learner)

**UI Deliverable:**
- Admin or instructor can enroll a learner
- Missing or non-learner email shows a clear error

---

### Step 4 — Learner Dashboard Update

**Actions:**
- Query enrolled courses for learner
- Render course list

**UI Deliverable:**
- Learner sees enrolled courses
- Links to course detail pages
- Instructor and admin dashboards remain based on ownership/all courses (unchanged)

---

### Step 5 — Course Access Guard

**Actions:**
- Enforce enrollment check on course routes

Rules:
- Learners must be enrolled
- Instructors must own course
- Admins may view all
- Non-enrolled learners see redirect/notice rather than a crash

**Backend Deliverable:**
- Access control enforced server-side

---

### Step 6 — Enrollment Visibility (Instructor)

**Actions:**
- Display enrolled learners on course page

**UI Deliverable:**
- Instructor sees list of enrolled learners

Constraints:
- Read-only
- No removal action

---

## 6. Validation Checklist

Phase 5 is complete when:

- [ ] Enrollment table exists
- [ ] Learners can be enrolled in courses
- [ ] Duplicate enrollments prevented
- [ ] Learner dashboard lists enrolled courses
- [ ] Course pages enforce enrollment access
- [ ] Instructor can view enrolled learners
- [ ] Non-learner emails cannot be enrolled; errors are clear

---

## 7. Demo Narrative (Phase 5)

At the end of Phase 5, you should be able to say:

> “We now have the full structural core of an LMS: users, courses, and enrollments. Learning can now happen inside courses.”

This is the point at which the LMS becomes operationally complete at a structural level.

---

## 8. Architectural Notes

- Enrollment is a join table, not a workflow engine
- No hidden state or transitions
- All checks are server-side

This reinforces the LMS-as-infrastructure framing.

---

## 9. Transition to Phase 6

Phase 5 enables Phase 6 by:

- Allowing learners to enter courses
- Making course membership explicit

Phase 6 will introduce **course content (modules and content items)**.

---

**End of Phase 5 Execution Plan**
