# CoreLMS Demonstration Project

## Phase 8 — Execution Plan
**Phase Name:** Assignments (Outcome Collection Begins)  
**Purpose:** Introduce assignments as structured prompts for learner work, initiating the third core LMS function: **recording learning outcomes**.

Phase 8 focuses strictly on *collecting* learner work. Evaluation, grading, and interpretation are intentionally deferred. Keep the surface area lean (demo prototype).

---

## 1. Phase 8 Objectives

By the end of Phase 8, the system should:

- Allow instructors to create assignments within a course
- Allow learners to submit work for assignments
- Persist submissions in the database
- Enforce role- and enrollment-based access
- Keep assignment semantics minimal and explicit

---

## 2. Scope Boundaries

### Included
- Assignment data model
- Assignment creation (instructor)
- Assignment submission (learner)
- Submission storage (text or file)

### Explicitly Excluded
- Grading or scoring
- Rubrics
- Feedback or comments
- Resubmission logic
- Due dates or late policies

Assignments are collection mechanisms, not evaluators.

---

## 3. Data Models Introduced in This Phase

### 3.1 Assignment Table

Fields (UUID/text ids, `created_at` default `now()`):
- `id`
- `course_id`
- `title`
- `description`
- `created_at`

Constraints:
- Assignments belong to a single course

---

### 3.2 Submission Table

Fields (UUID/text ids, `submitted_at` default `now()`):
- `id`
- `assignment_id`
- `user_id` (learner)
- `submission_text` (nullable)
- `file_url` (nullable, simple URL rather than blob upload)
- `submitted_at`

Constraints:
- One submission per learner per assignment (v0.1)

---

## 4. Assignment Semantics

- An assignment is a **prompt** attached to a course
- A submission is a **fact**: the learner submitted something at a time
- The LMS does not interpret the submission

There is no notion of quality, correctness, or completeness in this phase.

---

## 5. Step-by-Step Execution

### Step 1 — Assignment & Submission Schemas

**Actions:**
- Define `assignments` and `submissions` tables in `db/schema.ts`
- Add unique constraint on (`assignment_id`, `user_id`) and leave submissions immutable for now (v0 overwrites allowed)
- Generate and apply migrations (or manually run the SQL once; no runtime DDL)

**Deliverable:**
- Tables exist in Neon Postgres

---

### Step 2 — Assignment Creation (Instructor)

**Actions:**
- Implement `createAssignment()` server action
- Restrict to course instructor

**UI Deliverable:**
- Assignment creation form on course page (visible to admin + course instructor)

---

### Step 3 — Assignment Listing

**Actions:**
- Query assignments by course

**UI Deliverable:**
-- Assignment list visible to enrolled learners and instructors/admin; cards link to assignment detail

---

### Step 4 — Assignment Detail Page

**Actions:**
- Implement assignment detail route (course-scoped)

**UI Deliverable:**
- Assignment prompt displayed
- Submission status indicator

---

### Step 5 — Submission (Learner)

**Actions:**
-- Implement `submitAssignment()` server action
-- Accept:
  - text submission, or
  - file URL (no binary upload in v0)

**UI Deliverable:**
- Submission form
- Confirmation after submit

---

### Step 6 — Submission Visibility

**Actions:**
-- Allow learners to view their own submission
-- Allow instructors/admin to view all submissions (read-only)

**UI Deliverable:**
- Submission list/table

---

## 6. Validation Checklist

Phase 8 is complete when:

- [ ] Instructors can create assignments
- [ ] Assignments are visible to learners
- [ ] Learners can submit work
- [ ] Submissions persist in database
- [ ] Duplicate submissions prevented
- [ ] Instructors can view submissions

---

## 7. Demo Narrative (Phase 8)

At the end of Phase 8, you should be able to say:

> “The LMS now collects learner work. It records that a submission was made, but does not judge or interpret it.”

This begins the **third core LMS function**: recording outcomes.

---

## 8. Architectural Notes

- Submissions are immutable facts
- No grading logic introduced
- No feedback loop yet

This preserves the separation between collection and evaluation.

---

## 9. Transition to Phase 9

Phase 8 enables Phase 9 by:

- Establishing submissions as records

Phase 9 will introduce **grading and outcome recording**.

---

**End of Phase 8 Execution Plan**
