# CoreLMS — Current Implementation Description

*Describes the system as built, as of April 2026.*

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
| Create content and assignments | — | ✓ (own courses) | ✓ |
| Enroll learners | — | ✓ (own courses) | ✓ |
| Submit work | ✓ | — | — |
| Mark content complete | ✓ | — | — |
| Grade submissions | — | ✓ (own courses) | — |
| Manage user accounts | — | — | ✓ |
| Import course content | — | — | ✓ |

---

## 3. Data Model

The system stores nine core entity types and the relationships among them.

```
[ Learner ] ── enrolls in ──┐
                              ▼
                          [ Course ] <── taught by ── [ Instructor ]
                              │
                              │ organized into
                              ▼
                          [ Module ]
                              │
                              │ contains
                              ▼
                       [ Content Item ]
                              │
                  ┌───────────┴──────────┐
                  ▼                      ▼
          [ Completion ]          [ Assignment ]
         (Learner marks done)          │
                                       │ submission
                                       ▼
                                 [ Submission ]
                                       │
                                       │ evaluated as
                                       ▼
                                    [ Grade ]
```

### Entity Descriptions

**Users** — All actors in the system. Each user has a role (learner, instructor, admin) and an approval status.

**Courses** — The primary instructional container. Each course has one assigned instructor and a published status.

**Enrollments** — Records that a specific learner has access to a specific course. A learner may only access course content if enrolled (or if they are an Admin).

**Modules** — Organizational subdivisions within a course (analogous to chapters or units). Modules have a defined order within the course.

**Content Items** — Individual learning artifacts within a module. Each item has a type, a title, and content. Items have a defined order within their module.

**Completions** — A binary record that a learner has marked a specific content item as done. One completion record per learner per content item.

**Assignments** — Prompts for learner work, attached to a course. An assignment has a title and description.

**Submissions** — A learner's response to an assignment. Captures submitted text, an optional file reference, and a timestamp. A learner may update a prior submission.

**Grades** — A numeric score (0–100) attached to a submission, recorded by the grading instructor. One grade per submission. Grades cannot be changed after they are recorded.

---

## 4. Content Types

Content items in CoreLMS may be one of three types:

- **Page** — Free-form text content authored directly in the system.
- **Link** — A reference to an external URL.
- **Normalized Text** — Structured content imported from an external source and stored as a block sequence. Blocks may include paragraphs, headings, lists, and placeholder markers.

The system renders each type appropriately in the content viewer. It does not interpret or evaluate the substance of content.

---

## 5. Functional Behavior by Role

### 5.1 Learner

A learner signs in and is directed to their dashboard. The dashboard lists all courses in which they are enrolled.

From the course view, a learner can:

- Browse modules and content items
- Open and read individual content items
- Mark a content item as completed
- View all assignments for the course
- Open an assignment and read its description
- Submit work for an assignment (text and optional file URL)
- Update a previously submitted response
- View a recorded grade if one has been assigned

A learner cannot access any course in which they are not enrolled.

---

### 5.2 Instructor

An instructor signs in and is directed to their dashboard. The dashboard lists all courses assigned to that instructor.

From the course view, an instructor can:

- View enrolled learners (via enrollment records)
- Create modules within the course
- Create content items within a module (page or link types)
- Edit or delete existing modules and content items
- Create assignments within the course
- View all submissions for an assignment
- Assign a numeric grade (0–100) to an ungraded submission

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
- Import course content from a structured JSON source (`/admin/ingest`), which generates modules and normalized content items automatically

**Observation**
- View submissions and grades for any assignment in any course
- View completion progress for any course

Admins do not submit work or receive grades.

---

## 6. Course Content Workflow

Content in a course is organized hierarchically: a course contains modules, and modules contain content items. Both levels carry an explicit order field that determines display sequence.

The typical content creation path:

1. Admin creates a course and assigns an instructor.
2. Instructor creates one or more modules within the course.
3. Instructor creates content items within each module.
4. Enrolled learners view content items in module order and mark them complete.

Alternatively, an Admin may import a pre-structured course using the ingestion tool, which populates modules and normalized content items in a single operation from a JSON source file.

---

## 7. Assignment and Grading Workflow

1. Instructor creates an assignment with a title and description.
2. Enrolled learners view the assignment and submit work (text or file reference).
3. Instructor reviews submitted work.
4. Instructor assigns a score (0–100) to a submission.
5. The grade is recorded and the learner can view it on the assignment page.

A submission may be updated by the learner after initial submission. A grade, once recorded, cannot be changed.

---

## 8. Progress Tracking

Completion is tracked at the content item level. When a learner marks an item complete, a completion record is created. Duplicate completions for the same learner and item are silently ignored.

The course detail view displays completion counts per module for enrolled learners, and completion status indicators next to individual items. Instructors and admins can view the same information.

No completion inference occurs. The system does not mark items complete automatically.

---

## 9. System Boundaries

CoreLMS does not include:

- Program or pathway management
- Degree audit or credential tracking
- Financial records or billing
- Transcript generation
- Term or scheduling management
- Analytics dashboards or engagement metrics
- AI tutoring or recommendation systems
- Competency or outcome frameworks

These functions are outside the scope of the system.

---

## 10. Summary

CoreLMS connects learners, instructors, and admins through a shared set of instructional records. It organizes course content into modules and items, tracks learner completion explicitly, collects assignment submissions, and records instructor grades. User access is role-based and gated by an approval step at registration. Content may be authored directly or imported from structured external sources.

The system is a record of instructional activity. It does not evaluate, recommend, or interpret.

---

*End of implementation description*
