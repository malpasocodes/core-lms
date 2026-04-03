# CoreLMS — Product Requirements Document (Functional)

## 1. Purpose

CoreLMS is a deliberately minimal Learning Management System designed to implement the instructional core described in *Core‑LMS: A Data‑First View*. The system exists to perform three essential functions:

1. Deliver learning materials
2. Track learner progress
3. Record learning outcomes

This PRD defines the required functional behavior of CoreLMS. It describes what the system must do, not how it is implemented or how it appears in the interface.

---

## 2. System Scope

CoreLMS supports three primary user roles:

- Student
- Instructor
- Administrator

The system manages the following core entities:

- Users (Students, Instructors, Admins)
- Courses
- Enrollments
- Content Items
- Assignments
- Submissions
- Grades
- Progress Records (Content Completion)

CoreLMS is a system of record for instructional activity within courses. It does not manage programs, degrees, financial records, transcripts, or institutional compliance workflows.

---

## 3. Core Data Relationships

The system must enforce the following relationships:

- Students enroll in Courses
- Courses are taught by Instructors
- Courses contain Content Items
- Courses contain Assignments
- Students submit work for Assignments
- Instructors assign Grades to Submissions
- Students may mark Content Items as completed

All functionality derives from these relationships.

---

## 4. Functional Requirements

### 4.1 User Management

The system must:

- Allow creation of users with assigned roles (Student, Instructor, Admin)
- Authenticate users
- Enforce role-based access control
- Allow Admins to view users (read-only in v1 unless otherwise specified)

Role definitions:

- Students may access enrolled courses and submit work
- Instructors may manage courses they teach
- Admins may view system-wide summaries but do not teach or grade

---

### 4.2 Course Management

The system must:

- Allow creation of Courses
- Assign one Instructor per Course (v1 assumption)
- Allow Students to be enrolled in Courses
- Prevent access to course materials for non-enrolled users (except Admin)

Courses serve as containers for instructional activity.

---

### 4.3 Content Delivery

Instructors must be able to:

- Create Content Items within a Course
- Upload or author content (text, file reference, or link)
- Edit content prior to publication (v1 may treat creation as publication)

Students must be able to:

- View Content Items for courses in which they are enrolled

The system must record:

- Which Content Items belong to which Course

The system does not interpret content.

---

### 4.4 Progress Tracking

Students must be able to:

- Mark Content Items as completed

The system must:

- Record completion as a binary event
- Prevent duplicate completion records
- Associate completion with specific student and content item

Instructors must be able to:

- View completion status for students in their course

Admins must be able to:

- View aggregate completion summaries (read-only)

Progress tracking is explicit. No automatic inference is required.

---

### 4.5 Assignment Creation

Instructors must be able to:

- Create Assignments within a Course
- Provide title and description

Assignments are prompts for student work.

The system must associate Assignments with a specific Course.

---

### 4.6 Submission of Student Work

Students must be able to:

- Submit work for an Assignment in a course in which they are enrolled

The system must:

- Record submission timestamp
- Associate submission with Student and Assignment
- Prevent multiple submissions per assignment in v1 (unless specified otherwise)

Instructors must be able to:

- View submissions for assignments in their courses

---

### 4.7 Grading

Instructors must be able to:

- Assign a numeric grade to a Submission

The system must:

- Allow one grade per submission
- Record grader identity
- Record grading timestamp
- Enforce defined score range (e.g., 0–100 integer)
- Prevent re-grading in v1

Students must be able to:

- View their grade on the relevant Assignment

Admins must be able to:

- View grades system-wide (read-only)

The system records grades but does not interpret them.

---

## 5. Core User Workflows

### 5.1 Instructor Workflow

An Instructor must be able to:

1. Create a Course
2. Enroll Students (or view enrolled roster)
3. Upload or create Content Items
4. Create Assignments
5. View Student Submissions
6. Assign Grades
7. View progress summaries for students

End state: Instructor can deliver instruction and record outcomes within a course.

---

### 5.2 Student Workflow

A Student must be able to:

1. Access enrolled Courses
2. View Content Items
3. Mark Content Items as completed
4. View Assignments
5. Submit work
6. View assigned Grades

End state: Student can consume materials, submit work, and view recorded outcomes.

---

### 5.3 Administrator Workflow

An Administrator must be able to:

1. View Courses
2. View Instructors assigned to Courses
3. View enrollment counts
4. View completion summaries
5. View submissions and grades (read-only)

Admins do not create instructional artifacts or assign grades.

---

## 6. System Boundaries

CoreLMS does not include:

- Program management
- Degree audit
- Financial records
- Transcript generation
- Scheduling or term management
- Analytics dashboards
- AI tutoring systems
- Competency frameworks

These functions belong to other institutional systems.

---

## 7. Success Criteria

CoreLMS is complete when:

- Instructors can deliver materials and record outcomes
- Students can participate and view results
- The system accurately reflects instructional activity
- The data model aligns with the Core‑LMS data-first structure

---

## 8. Summary

CoreLMS is a minimal instructional system of record. It connects Students, Instructors, and Courses. It stores Content, tracks Participation, collects Submissions, and records Grades. It does not attempt to manage institutional governance or long-term academic lifecycle functions.

The purpose of CoreLMS is clarity: to define precisely what an LMS must do—and nothing more.

---

*End of Functional PRD*

