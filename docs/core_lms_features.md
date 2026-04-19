# Core LMS Features: Definition and Implementation

## What Is a "Core LMS"?

A Learning Management System (LMS) is software that organizations use to create, deliver, and track educational courses. Platforms like Canvas, Blackboard, Moodle, and D2L have dominated this market for decades, often at significant cost and complexity.

The claim behind CoreLMS is straightforward: **the essential functions of an LMS are not technically difficult to build.** They are a commodity — a well-understood set of features that any competent development team can replicate quickly using modern tools. What institutions pay for in enterprise LMS contracts is not the technology itself, but support, compliance certifications, and institutional inertia.

This document defines what those core features are and describes how each one is implemented in CoreLMS.

---

## The Core Features

### 1. User Accounts and Roles

**What it is:** An LMS must distinguish between different types of users. Typically there are at least three roles: the *administrator* who manages the system, the *instructor* who teaches courses, and the *learner* who takes them. Each role sees a different version of the system and can take different actions.

**How CoreLMS implements it:** Every user account has one of three roles: learner, instructor, or admin. The system enforces these boundaries throughout — learners can submit work but cannot create courses; instructors can build and grade their own courses but cannot touch another instructor's; admins can manage everything. New users are placed in a holding state until an admin approves their account, preventing unauthorized access.

---

### 2. Course Creation and Organization

**What it is:** Instructors need a way to create courses and organize their content into a logical structure — typically some hierarchy of units, modules, weeks, or chapters.

**How CoreLMS implements it:** Courses are organized in three levels: **Modules** (the top-level containers, like "Unit 1" or "Week 3"), **Sections** within each module (like "Lecture" or "Lab"), and **Activities** within each section (the actual content items). Instructors can create this structure freely and order it as they like. Courses can be kept in draft mode until the instructor is ready to publish them to learners.

---

### 3. Content Delivery

**What it is:** The most fundamental job of an LMS is delivering learning content to students. This content takes many forms: readings, videos, audio recordings, documents, and web links.

**How CoreLMS implements it:** CoreLMS supports nine types of content activities:

| Activity Type | What It Delivers |
|---|---|
| **Watch** | An embedded YouTube video |
| **Listen** | An uploaded audio file (lecture recording, podcast, etc.) |
| **Read** | An uploaded PDF or formatted text document |
| **Write** | A writing prompt where learners compose a response |
| **Page** | A free-form text page authored directly in the system |
| **Link** | An external web link |
| **PDF** | A PDF document displayed in-browser |
| **Markdown** | A formatted document using simple text markup |

Learners mark each activity complete as they work through it, and the system tracks their progress automatically.

---

### 4. Enrollment

**What it is:** Learners need to be formally enrolled in courses before they can access content or submit work. This creates the connection between a learner and a course.

**How CoreLMS implements it:** Instructors and admins can enroll learners in courses by searching for them by email address. The system verifies that the person being enrolled has a learner account before adding them. Learners can also be removed from a course if needed. Only enrolled learners can view course content and submit assignments.

---

### 5. Assignments and Submission

**What it is:** Assignments are how instructors ask learners to demonstrate what they have learned. Learners complete them and submit their work; instructors review and evaluate that work.

**How CoreLMS implements it:** CoreLMS supports two types of assignments:

- **Open-ended assignments** — the instructor writes a prompt; learners submit a written response, a file link, or both. Instructors then read and score each submission manually on a 0–100 scale.

- **Multiple-choice quizzes (MCQ)** — the instructor creates a set of questions, each with four answer choices and one correct answer. Learners select their answers and submit; the system scores the quiz automatically and immediately shows learners which answers were correct, which were wrong, and why.

Learners can update a submission before it is graded. Once graded, the submission is locked.

---

### 6. AI-Generated Quizzes

**What it is:** This feature goes beyond what traditional LMS platforms offer. Rather than requiring instructors to write quiz questions by hand, the system can read a course document and generate a complete quiz automatically.

**How CoreLMS implements it:** If an instructor has uploaded a PDF as a course reading, they can ask the system to generate a multiple-choice quiz from it. The system reads the document using an AI model (Claude, developed by Anthropic) and produces a set of questions — each with four answer choices, a correct answer, and a written explanation. The quiz is immediately available for learners to take. The instructor can preview the questions before publishing. The AI model used to generate each quiz is recorded for transparency.

This feature turns a task that might take an instructor an hour into one that takes about thirty seconds.

---

### 7. Grading

**What it is:** After learners submit work, instructors need a way to evaluate it and record scores. Learners need a way to see those scores and any feedback.

**How CoreLMS implements it:** For multiple-choice quizzes, grading is automatic — the system calculates the score the moment a learner submits. For open-ended assignments, the instructor sees a list of all submissions and enters a score (0–100) for each. Scores are visible to learners on their assignment page. The gradebook (described below) gives instructors a full view of all scores across the course.

---

### 8. Gradebook

**What it is:** Instructors need a single place to see how all their students are performing across all assignments — not just one assignment at a time. This is the gradebook: a grid of learners and assignments, filled in with scores.

**How CoreLMS implements it:** Each course has a Gradebook tab, visible to the instructor and admin. It displays a table where each row is an enrolled learner and each column is an assignment. Each cell shows the learner's score, color-coded for quick reading (green for strong performance, yellow for adequate, red for poor). Cells show "Submitted" if work has been turned in but not yet graded, and are empty if nothing has been submitted. The gradebook also shows average scores per assignment and per learner.

---

### 9. Learner Progress Tracking

**What it is:** Learners need to know where they are in a course — what they have done and what remains. Instructors benefit from knowing whether learners are keeping up.

**How CoreLMS implements it:** As learners complete each activity, the system records it. On the course page, learners see a progress bar showing what percentage of the course they have completed. This breaks down further: each module shows its own progress bar, and each individual section shows a count of completed activities. Progress is updated in real time as learners work through the material.

---

### 10. Due Dates

**What it is:** Instructors set deadlines for assignments. Learners need to know when work is due. The system should make upcoming and overdue deadlines visible.

**How CoreLMS implements it:** Each assignment can have an optional due date, set by the instructor at the time of creation. Due dates are displayed on the assignments list for the course and on each individual assignment page. If a deadline has passed, the due date appears in red with an "Overdue" label, making it immediately visible to both learners and instructors.

---

### 11. Announcements

**What it is:** Instructors need a way to communicate with the whole class — to post reminders, share updates, or clarify instructions. This is the announcement board: a simple message feed visible to everyone enrolled in the course.

**How CoreLMS implements it:** Each course has an Announcements tab. Instructors and admins can write and post messages to the course; all enrolled learners can read them. Messages are displayed newest first, with the author's name and the date and time of posting. Instructors can delete their own announcements at any time. Learners see the feed as read-only.

---

## Summary

| Core Feature | Status in CoreLMS |
|---|---|
| User accounts and roles | ✅ Implemented |
| Course creation and organization | ✅ Implemented |
| Content delivery (multiple formats) | ✅ Implemented |
| Enrollment management | ✅ Implemented |
| Assignments and submission | ✅ Implemented |
| AI-generated quizzes | ✅ Implemented |
| Grading (manual and automatic) | ✅ Implemented |
| Gradebook | ✅ Implemented |
| Learner progress tracking | ✅ Implemented |
| Due dates | ✅ Implemented |
| Announcements | ✅ Implemented |
| Discussion threads | Planned (Priority 5) |

---

## The Larger Point

Traditional LMS platforms have convinced institutions that the technology powering these features is complex and proprietary. CoreLMS demonstrates that this is not true. Every feature described above was built by a small team in a matter of days, using readily available tools and AI-assisted development.

The technology is a commodity. The eleven features in this document represent the full functional core of what an LMS does — and all of them can be built, owned, and modified without a six-figure annual license fee.

What remains genuinely differentiating in enterprise LMS platforms is not the feature set but the surrounding infrastructure: accessibility compliance, single sign-on integration with large institutions, long-term vendor support contracts, and legacy data migration. Those are real considerations. But they are institutional and contractual problems, not technical ones.
