# CoreLMS — Current Implementation Description

*Describes the system as built, as of April 2026.*

*Last revised: 2026-04-20.*

---

## 1. Purpose

CoreLMS is a minimal Learning Management System that delivers learning materials, tracks learner progress, and records learning outcomes. This document describes the system's current functional behavior — what it does, who can do it, and how the data is organized.

---

## 2. User Roles and Access

The system supports three user roles: **Learner**, **Instructor**, and **Admin**. Roles are assigned at the time a user account is created or approved.

Authentication is managed externally. Users sign in through a hosted authentication provider. The system does not store passwords.

### Approval Workflow

New users who register independently are placed in a pending state. They cannot access the system until an Admin reviews their registration and assigns them a role. Admins may also approve or reject pending users from the admin interface.

Users created directly by an Admin are active immediately.

### Role Capabilities Summary

| Capability | Learner | Instructor | Admin |
|---|---|---|---|
| View enrolled courses | ✓ | — | ✓ |
| View courses they teach | — | ✓ | ✓ |
| Create and edit courses | — | — | ✓ |
| Create modules, sections, and activities | — | ✓ (own courses) | ✓ |
| Import course structure and section text from OpenStax | — | ✓ (own courses) | ✓ |
| Post course announcements | — | ✓ (own courses) | ✓ |
| Enroll learners | — | ✓ (own courses) | ✓ |
| Submit work (open-ended or MCQ) | ✓ | — | — |
| Mark content complete | ✓ | — | — |
| Grade open-ended submissions | — | ✓ (own courses) | — |
| Manage user accounts | — | — | ✓ |
| Ingest OpenStax textbooks into the content library | — | — | ✓ |
| Ingest normalized JSON content | — | — | ✓ |

---

## 3. Data Model

The system stores the following core entity types and the relationships among them.

```
[ Learner ] ── enrolls in ──┐
                              ▼
                          [ Course ] <── taught by ── [ Instructor ]
                              │                         │
                              │ organized into          │ posts
                              ▼                         ▼
                          [ Module ]               [ Announcement ]
                              │
                              │ divided into
                              ▼
                          [ Section ]
                              │
                              │ contains
                              ▼
                      [ Content Item ]                [ Assignment ]
                    (Watch / Listen /        ── may link to ──┘
                       Read / Write)                          │
                              │                               │ submission
                              │                               ▼
                     [ Completion ]                   [ Submission ]
                (Learner marks done)                          │
                                                              │ evaluated as
                                                              ▼
                                                           [ Grade ]
```

An assignment may be **open-ended** (submitted as text and/or a file URL, graded manually) or **MCQ** (multiple-choice, backed by a set of questions and auto-scored).

### Entity Descriptions

**Users** — All actors in the system. Each user has a role (learner, instructor, admin) and an approval status.

**Courses** — The primary instructional container. Each course has one assigned instructor and a published status.

**Enrollments** — Records that a specific learner has access to a specific course. A learner may only access course content if enrolled (or if they are an Admin).

**Modules** — Organizational subdivisions within a course (analogous to chapters or units). Modules have a defined order within the course.

**Sections** — Subdivisions within a module. Content items are grouped into sections. Sections have a defined order within their module. A section may optionally carry a reference to an external source (e.g., an OpenStax section) so follow-on imports can find the corresponding material.

**Content Items** — Individual learning artifacts within a section. Each item has a type, a title, stored content (URL, text, or HTML), optional structured metadata, and a defined order within its section.

**Completions** — A binary record that a learner has marked a specific content item as done. One completion record per learner per content item.

**Assignments** — Prompts for learner work, attached to a course. Each assignment has a title, description, type (open-ended or MCQ), optional section association, optional due date, and optional links to a source content item or a linked activity.

**MCQ Questions** — For MCQ assignments, the ordered list of multiple-choice questions, each with options, a correct index, and an optional explanation. MCQ questions can be generated from a PDF Read activity using the AI model recorded in `mcq_model`.

**Submissions** — A learner's response to an assignment. Captures submitted text, an optional file URL, and — for MCQ assignments — the learner's selected answers. One submission per learner per assignment; it may be updated in place.

**Grades** — A numeric score (0–100) attached to a submission. Open-ended grades are recorded by an instructor; MCQ grades are recorded automatically by the system at submission time (`graded_by` is null). One grade per submission. Manually recorded grades cannot be changed after they are recorded.

**Announcements** — Short posts attached to a course, authored by an instructor or admin and visible to enrolled learners.

**OpenStax Library** — A separate set of tables (`openstax_books`, `openstax_chapters`, `openstax_sections`) holds pre-ingested OpenStax textbook content: book metadata, chapter titles, and the raw HTML for each section. This library is the source material for instructor-initiated structure and content imports (see §6).

---

## 4. Content Item Types

Content items are organized around four instructor-authored **activity types**, plus a set of legacy/ingestion types that persist for content imported from external sources.

### Activity Types

The primary authoring model. When an instructor adds content to a section, they choose one of:

- **Watch** — A YouTube video. Stored as the video URL; rendered as an embedded player.
- **Listen** — An uploaded audio file (MP3, M4A, WAV, OGG, WebM, up to 100 MB). Stored in object storage; rendered as an HTML audio player.
- **Read** — Reading material in one of three representations:
  - **PDF** — Uploaded PDF (up to 20 MB), stored in object storage, rendered in an iframe.
  - **Markdown** — Uploaded `.md` file, stored inline, rendered with GitHub-flavored Markdown plus math (KaTeX).
  - **HTML** — Content imported from an OpenStax section, stored inline as HTML, rendered inside a typographic wrapper. Preserves figures, tables, and math.
- **Write** — A writing prompt with optional minimum and maximum character counts. The learner composes a response inline.

Instructor-facing forms for these four types are available under each section in the course view.

### Legacy / Ingestion Types

Present in the content type enum for backward compatibility with earlier authoring flows and the normalized JSON ingestion pipeline:

- **Page** — Free-form text content authored directly in the system.
- **Link** — A reference to an external URL.
- **Normalized Text** — Structured content imported from a normalized JSON source and stored as a block sequence (paragraphs, headings, lists, placeholder markers).
- **PDF**, **Markdown** — Predecessors to the unified `read` type; newer uploads use `read` with a `fileType` payload field instead.

The system renders each type appropriately in the content viewer. It does not interpret the substance of content, except for MCQ submissions (see §7).

---

## 5. Functional Behavior by Role

### 5.1 Learner

A learner signs in and is directed to their dashboard. The dashboard lists all courses in which they are enrolled.

From the course view, a learner can:

- Browse modules, sections, and activities
- Open any activity — Watch a video, Listen to audio, Read a PDF/Markdown/OpenStax section, Write a response to a prompt
- Mark a content item as completed
- See the course announcements feed
- View all assignments for the course, including due dates
- Open an assignment and read its description
- Submit work: for open-ended assignments, submit text and/or a file URL; for MCQ assignments, select one option per question
- Update a previously submitted response
- View a recorded grade if one has been assigned

A learner cannot access any course in which they are not enrolled.

---

### 5.2 Instructor

An instructor signs in and is directed to their dashboard. The dashboard lists all courses assigned to that instructor.

From the course view, an instructor can:

- View enrolled learners (via enrollment records)
- Create modules within the course, and sections within each module
- Create Watch, Listen, Read, and Write activities within a section
- Import a course structure from an OpenStax textbook — chapters become modules and sections become module sections, referenced back to their OpenStax source for later content imports
- One-click import an OpenStax section's text as a Read activity into the corresponding course section (available whenever the section carries an OpenStax source reference from the structure import)
- Edit or delete existing modules, sections, and activities
- Post course announcements (a title-less body, visible to enrolled learners)
- Create open-ended assignments with an optional due date and optional section association
- Generate an MCQ assignment from an existing PDF Read activity (the AI model used is recorded on the assignment)
- View all submissions for an assignment
- Assign a numeric grade (0–100) to an ungraded open-ended submission

From the course list, an instructor can view their courses but cannot create new courses.

An instructor's access is limited to courses they teach. They cannot view or modify courses belonging to other instructors.

---

### 5.3 Admin

An admin signs in and is directed to the admin dashboard. The dashboard lists all courses in the system with instructor and enrollment information.

Admins can:

**User management (`/admin/roster`)**
- View all users organized by role
- Create new user accounts with assigned roles
- Edit a user's role
- Delete a user account
- Review pending registration requests
- Approve a pending user and assign their role
- Reject a pending registration

**Enrollment management (`/admin/enroll`)**
- Enroll a learner in any course by selecting a course and learner
- View current enrollments by course

**Course management**
- Create new courses and assign an instructor
- Edit course title, description, instructor, and published status
- Delete a course

**Content management**
- Perform any action an instructor can perform, on any course
- Ingest OpenStax textbooks into the content library (`/admin/openstax`): fetches a book's table of contents and section HTML from the OpenStax archive, then stores it for instructor-initiated course imports
- Import course content from a structured JSON source (`/admin/ingest`), which generates modules and normalized content items automatically
- Seed demo content (`/admin/seed`)

**Observation**
- View submissions and grades for any assignment in any course
- View completion progress for any course

Admins do not submit work or receive grades.

---

## 6. Course Content Workflow

Content in a course is organized hierarchically: a course contains modules, modules contain sections, and sections contain content items (activities). Every level carries an explicit order field that determines display sequence.

### Manual Authoring Path

1. Admin creates a course and assigns an instructor.
2. Instructor creates one or more modules within the course.
3. Instructor creates sections within each module.
4. Instructor creates Watch, Listen, Read, and/or Write activities within each section.
5. Enrolled learners work through the activities in order and mark them complete.

### OpenStax Import Path

OpenStax content is available to instructors in two stages, which can be combined or used independently.

**Stage 1 — Admin ingests textbooks.** From `/admin/openstax`, an admin fetches a book from the OpenStax archive using its Connexions (CNX) ID. The system retrieves the book's table of contents and the raw HTML for every section, and stores it in the OpenStax library tables. This operation is destructive for any prior copy of the same book and is idempotent under re-ingest.

**Stage 2 — Instructor imports structure into a course.** From a course's Import tab, the instructor picks an ingested OpenStax book and imports its chapters as modules and its sections as module sections. Each imported module and section stores a `sourceRef` back to its OpenStax origin. No content items are created at this stage; the instructor still decides what to materialize.

**Stage 3 — Instructor imports section text as Read activities.** Within any module section that carries an OpenStax `sourceRef`, the instructor can one-click import the underlying OpenStax section's HTML as a Read activity. The resulting activity is a Read item with `fileType: "html"` and preserves figures, tables, and math from the source.

### Normalized JSON Import Path

An admin may also import a pre-structured course using the normalized ingestion tool (`/admin/ingest`), which reads a JSON source and populates modules and normalized content items in a single operation.

---

## 7. Assignment and Grading Workflow

Assignments come in two types. Both are attached to a course, may optionally be associated with a specific section, and may carry an optional due date that is displayed to learners.

### Open-Ended Assignments

1. Instructor creates an assignment with a title, description, and optional due date.
2. Enrolled learners view the assignment and submit work (text and/or a file URL).
3. Instructor reviews submitted work.
4. Instructor assigns a score (0–100) to a submission.
5. The grade is recorded and the learner can view it on the assignment page.

A submission may be updated by the learner. A manually recorded grade cannot be changed after it is recorded.

### Multiple-Choice (MCQ) Assignments

1. Instructor generates an MCQ assignment from an existing PDF Read activity. An AI model produces a set of questions (text, options, correct index, optional explanation), which are stored alongside the assignment.
2. The instructor reviews and can edit the generated questions before publishing (if applicable to the UI flow).
3. A learner opens the MCQ assignment and selects one option per question.
4. On submission, the learner's answers are stored and scored automatically against the correct-option indexes. A grade record is created at submission time with `graded_by` set to null, indicating system-generated grading.

The AI model used for generation is recorded on the assignment (`mcq_model`). MCQ assignments retain the optional due date and optional section association available to open-ended assignments.

---

## 8. Progress Tracking

Completion is tracked at the content item level. When a learner marks an item complete, a completion record is created. Duplicate completions for the same learner and item are silently ignored.

The course detail view displays completion counts per module for enrolled learners, and completion status indicators next to individual items. Instructors and admins can view the same information.

No completion inference occurs. The system does not mark items complete automatically.

---

## 9. Announcements

Instructors (and admins) can post short announcements to a course. Each announcement has a body, an author, and a timestamp. Announcements are visible to enrolled learners on the course's announcements view and are ordered most-recent-first. An instructor may delete an announcement they posted. No reply or threading is supported.

---

## 10. System Boundaries

CoreLMS does not include:

- Program or pathway management
- Degree audit or credential tracking
- Financial records or billing
- Transcript generation
- Term or scheduling management
- Analytics dashboards or engagement metrics
- AI tutoring or recommendation systems
- Competency or outcome frameworks
- Discussion forums, threaded replies, or peer interaction beyond shared announcements
- Rubric definition or multi-dimensional grading

These functions are outside the scope of the system.

---

## 11. Summary

CoreLMS connects learners, instructors, and admins through a shared set of instructional records. It organizes course content into modules, sections, and activities (Watch, Listen, Read, Write), tracks learner completion explicitly, collects open-ended and multiple-choice assignment submissions, records instructor grades, and surfaces course announcements. User access is role-based and gated by an approval step at registration. Content may be authored directly, imported from OpenStax textbooks in two stages (admin ingest, instructor course-side import), or ingested from a structured JSON source.

The system is a record of instructional activity. Aside from auto-scoring MCQ submissions against a stored answer key, it does not evaluate, recommend, or interpret learner work.

---

*End of implementation description*
