# CoreLMS Demonstration Project

## Phase 6 — Execution Plan
**Phase Name:** Course Content — Modules & Content Items  
**Purpose:** Introduce learning materials into the system by implementing modules and content items, completing the first core LMS function: **delivery of learning materials**.

Phase 6 makes courses *inhabitable*. Until now, courses existed structurally; this phase allows instructors to place content inside them and learners to view it.

---

## 1. Phase 6 Objectives

By the end of Phase 6, the system should:

- Support creating modules within a course
- Support adding ordered content items to modules
- Render content items for enrolled learners
- Enforce access control based on role and enrollment
- Keep content types intentionally minimal

---

## 2. Scope Boundaries

### Included
- Module data model
- Content item data model
- Content creation (instructor)
- Content delivery (learner)
- Sequential navigation

### Explicitly Excluded
- Rich media authoring
- Content analytics
- Branching or adaptive paths
- Prerequisites
- Search
- Versioning

Content delivery is linear and explicit.

---

## 3. Data Models Introduced in This Phase

### 3.1 Module Table

Fields:
- `id`
- `course_id`
- `title`
- `order`
- `created_at`

Constraints:
- Modules belong to a single course
- Ordering is integer-based and contiguous

---

### 3.2 ContentItem Table

Fields:
- `id`
- `module_id`
- `type` ("page" | "file" | "link")
- `title`
- `content` (text or URL)
- `order`
- `created_at`

Constraints:
- Content items belong to a single module
- Ordering is integer-based and contiguous

---

## 4. Content Semantics

- Content items are **static instructional resources**
- The LMS delivers content but does not interpret it
- Completion is not inferred in this phase

---

## 5. Step-by-Step Execution

### Step 1 — Schema & Migrations

**Actions:**
- Define `modules` and `content_items` tables in `db/schema.ts`
- Generate and apply migrations
  - UUID ids
  - `order` starts at 1 and appends as max+1 (no reordering in this phase)
  - `created_at` defaults to now
  - FKs to courses/modules

**Deliverable:**
- Tables exist in Neon Postgres

---

### Step 2 — Module Creation (Instructor)

**Actions:**
- Implement `createModule()` server action
- Restrict to course instructor (or admin)
- Append new module to end of list (max order + 1)

**UI Deliverable:**
- Module creation form on course page

---

### Step 3 — Module Listing & Ordering

**Actions:**
- Query modules by course
- Sort by `order`

**UI Deliverable:**
- Ordered list of modules on course page

---

### Step 4 — Content Item Creation (Instructor)

**Actions:**
- Implement `createContentItem()` server action
- Support types:
  - Text page
  - External link

**UI Deliverable:**
- Content creation form within module view

Note:
- File uploads excluded in this phase (demo scope)
- Text pages stored as plain text/markdown string

---

### Step 5 — Content Item Rendering (Learner)

**Actions:**
- Implement content item page
- Render based on type

**UI Deliverable:**
- Learner can view content

---

### Step 6 — Sequential Navigation

**Actions:**
- Determine previous/next content item

**UI Deliverable:**
- Next / Previous buttons within a module (no cross-module nav in this phase)

---

### Step 7 — Access Control

**Actions:**
- Enforce:
  - Instructor owns course
  - Learner is enrolled
  - Admin read access
- Non-enrolled learners redirected or shown a friendly message (no crash)
- Module/item lists hidden from non-enrolled learners

**Backend Deliverable:**
- Server-side guards on module and content routes

---

## 6. Validation Checklist

Phase 6 is complete when:

- [ ] Instructors can create modules
- [ ] Instructors can add content items
- [ ] Modules and items are ordered correctly
- [ ] Learners can view content
- [ ] Navigation works sequentially
- [ ] Access control enforced

---

## 7. Demo Narrative (Phase 6)

At the end of Phase 6, you should be able to say:

> “Courses now contain learning materials. Instructors place content into modules, and learners can move through it. This is the LMS delivering learning materials—nothing more.”

This completes the **first of the three core LMS functions**.

---

## 8. Architectural Notes

- Ordering is explicit and stored
- No inferred structure
- No pedagogical intelligence

This reinforces the LMS as a delivery mechanism.

---

## 9. Transition to Phase 7

Phase 6 enables Phase 7 by:

- Establishing content items as navigable units

Phase 7 will introduce **progress tracking (completion flags)**.

---

**End of Phase 6 Execution Plan**
