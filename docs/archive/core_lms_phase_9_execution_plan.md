# CoreLMS Demonstration Project

## Phase 9 — Execution Plan
**Phase Name:** Grading (Outcome Evaluation & Recording)  
**Purpose:** Introduce grading as a minimal, explicit mechanism for evaluating learner submissions, completing the third core LMS function: **recording learning outcomes**. This phase is intentionally narrow: numeric scores only, immutable once set, and strictly role-gated.

Phase 9 deliberately limits grading to numeric scores recorded as facts. Interpretation, analytics, and feedback are intentionally excluded.

---

## 1. Phase 9 Objectives

By the end of Phase 9, the system should:

- Allow instructors to assign grades to submissions
- Persist grades in the database
- Display grades to learners
- Enforce strict role-based permissions
- Keep grading semantics minimal and transparent

---

## 2. Scope Boundaries

### Included
- Grade data model
- Grade entry (instructor-only)
- Grade visibility (learner on assignment detail; admin read-only)

### Explicitly Excluded
- Rubrics
- Feedback comments
- Regrading workflows
- Weighted averages
- Course-level analytics
- Pass/fail logic

Grades are atomic records, not evaluations systems.

---

## 3. Data Model Introduced in This Phase

### 3.1 Grade Table

Fields:
- `id`
- `submission_id`
- `score` (integer, 0–100 inclusive)
- `graded_by` (instructor user ID)
- `graded_at`

Constraints:
- One grade per submission (unique submission_id)
- Score range enforced at both UI and server levels
- Grades are immutable (no updates; attempts to re-grade fail)

---

## 4. Grading Semantics

- A grade is an **instructor-assigned numeric value** (0–100, integer)
- Grades are immutable once recorded (v0.1); re-grading attempts fail
- The LMS does not interpret grades

There is no concept of:
- mastery
- competency
- achievement level

Those belong to downstream systems.

---

## 5. Step-by-Step Execution

### Step 1 — Grade Schema & Migration

**Actions:**
- Define `grades` table in `lib/schema.ts`
- Add foreign key to `submissions` and `graded_by` to `users`
- Generate and apply Drizzle migration (committed to repo)

**Deliverable:**
- Grades table exists in Neon Postgres via migration

---

### Step 2 — Grading Server Action

**Actions:**
- Implement `gradeSubmission()` server action
- Restrict to course instructor only (no admin override)
- Enforce integer 0–100; reject if already graded

**Backend Deliverable:**
- Grade records persisted; re-grading attempts blocked

---

### Step 3 — Grading UI (Instructor)

**Actions:**
- Add grading interface to submission view

**UI Deliverable:**
- Integer input for score (0–100)
- Submit grade action; disable when graded

Constraints:
- No edit after submission (immutable)

---

### Step 4 — Grade Visibility (Learner)

**Actions:**
- Display grade on assignment detail page only

**UI Deliverable:**
- Learner sees numeric score if graded

---

### Step 5 — Admin Visibility (Read-Only)

**Actions:**
- Allow admin to view grades system-wide (inspection-only)

**UI Deliverable:**
- Read-only grade listings (non-interactive)

---

## 6. Validation Checklist

Phase 9 is complete when:

- [ ] Grades table exists via migration
- [ ] Instructors can grade submissions (0–100 int)
- [ ] Grades persist in database; re-grading blocked
- [ ] Learners can view their grades (assignment page)
- [ ] Admins can view grades (read-only)
- [ ] Role enforcement verified (instructor-only grading; admin read-only)

---

## 7. Demo Narrative (Phase 9)

At the end of Phase 9, you should be able to say:

> “The LMS now records evaluated outcomes. A submission received a numeric score—nothing more, nothing less.”

This completes the **third core LMS function**.

---

## 8. Architectural Notes

- Grades are stored as atomic facts
- No derived metrics stored
- No cross-assignment aggregation

This reinforces the LMS as a system of record.

---

## 9. Transition to Phase 10

Phase 9 enables Phase 10 by:

- Providing grade records

Phase 10 will introduce a **gradebook view**, aggregating grades per course.

---

**End of Phase 9 Execution Plan**
