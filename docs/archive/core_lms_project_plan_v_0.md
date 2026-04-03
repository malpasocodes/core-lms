# CoreLMS Demonstration Project

## Project Plan (15 Phases)
**Version:** v0.1  
**Status:** Draft (Demonstration Project)

---

## 1. Planning Philosophy

This project plan is designed to reinforce the demonstration goals of CoreLMS:

- Show that a core LMS can be built **quickly and incrementally**
- Avoid long "plumbing-first" phases with no visible output
- Develop **UI/UX and backend wiring in tandem** from the start

Each phase produces something:
- visible in the UI
- executable in the system
- demonstrable to a non-technical audience

Backend work exists to support concrete user-facing flows as early as possible.

---

## 2. Phase Structure

- Each phase is intentionally small
- Each phase results in a working, inspectable artifact
- Earlier phases bias toward UI scaffolding + minimal backend
- Later phases deepen functionality, not scope

Phases are ordered to maximize learning and feedback early.

---

## Phase 1 — Project Initialization

**Goals:**
- Establish development environment
- Verify deployment pipeline

**Deliverables:**
- Next.js project running locally
- Vercel deployment working
- Environment variables configured

**UI:**
- Landing page (placeholder)

**Backend:**
- Neon Postgres connection verified

---

## Phase 2 — Global Layout and Navigation

**Goals:**
- Establish application shell

**Deliverables:**
- Top navigation bar
- Route structure in place

**UI:**
- shadcn layout components
- Dashboard placeholder

**Backend:**
- Auth session stub (no persistence yet)

---

## Phase 3 — Authentication (End-to-End)

**Goals:**
- Enable real users to log in

**Deliverables:**
- Login and registration working

**UI:**
- Login form
- Registration form

**Backend:**
- User table
- Password hashing
- Session persistence

---

## Phase 4 — Role-Aware Dashboard

**Goals:**
- Differentiate learner vs instructor experience

**Deliverables:**
- Role-based dashboard views

**UI:**
- Learner dashboard: enrolled courses list
- Instructor dashboard: owned courses list

**Backend:**
- Role checks
- Course ownership query

---

## Phase 5 — Course Creation and Listing

**Goals:**
- Make courses real objects

**Deliverables:**
- Instructor can create courses
- Courses visible on dashboard

**UI:**
- Course creation form
- Course list table

**Backend:**
- Course table
- Create/read operations

---

## Phase 6 — Enrollment Flow

**Goals:**
- Connect students to courses

**Deliverables:**
- Students enrolled in courses

**UI:**
- Enrollment action (button or form)
- Updated dashboard view

**Backend:**
- Enrollment join table
- Enrollment logic

---

## Phase 7 — Course Overview Page

**Goals:**
- Establish course as central workspace

**Deliverables:**
- Course overview page

**UI:**
- Course metadata
- Module list (empty initially)

**Backend:**
- Course detail queries

---

## Phase 8 — Module Creation and Ordering

**Goals:**
- Introduce internal course structure

**Deliverables:**
- Modules added to courses

**UI:**
- Module creation form
- Ordered module list

**Backend:**
- Module table
- Ordering logic

---

## Phase 9 — Content Item Delivery

**Goals:**
- Deliver learning materials

**Deliverables:**
- Content items viewable by learners

**UI:**
- Content item page
- Next/previous navigation

**Backend:**
- Content item table
- Content retrieval logic

---

## Phase 10 — Progress Tracking

**Goals:**
- Record learner interaction

**Deliverables:**
- Content completion recorded

**UI:**
- Completion indicator

**Backend:**
- Progress table
- Completion timestamps

---

## Phase 11 — Assignment Creation

**Goals:**
- Introduce assessment

**Deliverables:**
- Assignments associated with courses

**UI:**
- Assignment creation form
- Assignment list

**Backend:**
- Assignment table

---

## Phase 12 — Assignment Submission

**Goals:**
- Collect learner work

**Deliverables:**
- Learners submit assignments

**UI:**
- Submission form

**Backend:**
- Submission table
- File storage wiring

---

## Phase 13 — Grading

**Goals:**
- Record outcomes

**Deliverables:**
- Instructors grade submissions

**UI:**
- Grading interface

**Backend:**
- Grade recording

---

## Phase 14 — Gradebook

**Goals:**
- Aggregate outcomes

**Deliverables:**
- Gradebook view
- CSV export

**UI:**
- Grade table
- Export button

**Backend:**
- Grade queries

---

## Phase 15 — Demonstration Polish

**Goals:**
- Prepare system for demonstration

**Deliverables:**
- Seed data
- Demo script
- Documentation updates

**UI:**
- Minor layout cleanup

**Backend:**
- Data sanity checks

---

## 3. Summary

This phased plan emphasizes **early UI visibility**, incremental backend wiring, and continuous demonstrability.

At no point is the system "headless" or abstract. Each phase reinforces the central argument of CoreLMS:

> The core LMS can be built quickly, transparently, and with modest effort—because it is infrastructure, not innovation.

---

**End of Project Plan**

