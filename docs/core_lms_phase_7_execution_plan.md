# CoreLMS Demonstration Project

## Phase 7 — Execution Plan
**Phase Name:** Progress Tracking (Completion Flags)  
**Purpose:** Implement the second core LMS function: **tracking learner progress**, using explicit, minimal completion records tied to content items.

Phase 7 deliberately avoids analytics, engagement metrics, or inference. Progress is recorded only as explicit learner actions.

---

## 1. Phase 7 Objectives

By the end of Phase 7, the system should:

- Allow learners to explicitly mark content items as completed
- Persist completion records in the database
- Display completion state in the UI
- Aggregate completion status at the module level
- Enforce progress tracking strictly per learner, per course

---

## 2. Scope Boundaries

### Included
- Completion data model
- Completion recording
- Completion display (item + module)
- Role-appropriate visibility

### Explicitly Excluded
- Time-on-task tracking
- Automatic completion inference
- Engagement scoring
- Learning analytics dashboards
- Cross-course progress

Progress is binary and explicit by design.

---

## 3. Data Model Introduced in This Phase

### 3.1 Progress / Completion Table

Fields:
- `id`
- `user_id` (learner)
- `content_item_id`
- `completed_at`

Constraints:
- Unique (`user_id`, `content_item_id`) pair
- Learners only

---

## 4. Progress Semantics

- Completion is an **explicit learner action**
- Completion is immutable once recorded
- Absence of a record means "not completed"

There is no concept of:
- partial completion
- percentage complete
- inferred engagement

---

## 5. Step-by-Step Execution

### Step 1 — Progress Schema & Migration

**Actions:**
- Define `content_progress` (or `completions`) table in `db/schema.ts`
- UUID ids, `completed_at` default now
- Unique constraint on (`user_id`, `content_item_id`)
- Generate and apply migration (local + Vercel)

**Deliverable:**
- Progress table exists in Neon Postgres

---

### Step 2 — Completion Server Action

**Actions:**
- Implement `markContentComplete()` server action
- Restrict to:
  - authenticated learner
  - enrolled in course
- Explicitly append-only (no delete/edit); button hides after completion

**Backend Deliverable:**
- Completion records persisted

---

### Step 3 — Content Item UI (Learner)

**Actions:**
- Add "Mark as Complete" button to content item page

**UI Deliverable:**
- Learner can explicitly mark completion

Behavior:
- Button disabled or hidden after completion

---

### Step 4 — Completion Indicator (Item Level)

**Actions:**
- Query completion status for current user

**UI Deliverable:**
- Visual indicator (e.g., checkmark or badge)

---

### Step 5 — Module-Level Aggregation

**Actions:**
- Aggregate completion across items in a module

**UI Deliverable:**
- Module shows:
  - completed / total items
- Computed on read; no cross-module rollup

---

### Step 6 — Instructor Visibility (Read-Only)

**Actions:**
- Allow instructors to view completion summaries per learner

**UI Deliverable:**
- Read-only completion table
- Lives on course page; only shows enrolled learners

Constraints:
- No editing or overrides

---

## 6. Validation Checklist

Phase 7 is complete when:

- [ ] Completion table exists
- [ ] Learners can mark items complete
- [ ] Duplicate completions prevented
- [ ] Item-level completion displayed
- [ ] Module-level aggregation displayed
- [ ] Instructors can view progress summaries

---

## 7. Demo Narrative (Phase 7)

At the end of Phase 7, you should be able to say:

> “The LMS now tracks learner progress. Progress is explicit, binary, and recorded as facts—nothing is inferred.”

This completes the **second core LMS function**.

---

## 8. Architectural Notes

- Progress is a join between learners and content items
- No derived metrics stored
- All aggregation is computed on read

This preserves data simplicity and transparency.

---

## 9. Transition to Phase 8

Phase 7 enables Phase 8 by:

- Establishing progress records

Phase 8 will introduce **assignments**, beginning the third core LMS function: recording outcomes.

---

**End of Phase 7 Execution Plan**
