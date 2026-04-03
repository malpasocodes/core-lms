# Core‑LMS: A Data‑First View

*Draft presentation document*

---

## 1. Start With the Data

A useful way to understand a Learning Management System is to ignore features and start with data.

At the most basic level, an LMS exists to record a small number of durable facts:

- **Students** are enrolled in **courses**
- **Courses** are taught by **instructors**

Nothing meaningful in an LMS happens outside of these relationships.

---

## 2. Core Actors and Relationships

The foundational entities are simple and familiar.

- Students
- Instructors
- Courses

The relationships among them define the system.

### Diagram 1 — Core Relationships

```
[ Student ] ── enrolls in ──> [ Course ] <── taught by ── [ Instructor ]
```

This diagram captures the structural core of the LMS. Every additional capability builds on top of this.

---

## 3. Content Lives Inside Courses

Once courses exist, instructors populate them with learning materials.

- Instructors create or upload **content items**
- Content items live **inside courses**
- Students view content items as part of their learning

Content items may be:
- Text pages
- Documents
- Videos
- External links

At the data level, these are simply artifacts associated with a course.

### Diagram 2 — Content Inside Courses

```
[ Instructor ]
      │
      │ creates
      ▼
[ Content Item ] ── belongs to ──> [ Course ] <── enrolled ── [ Student ]
```

The LMS records that content exists and that it was made available. It does not need to interpret the content.

---

## 4. Assignments and Student Work

In addition to content, instructors create **assignments, quizzes, or tests**.

- An assignment is a prompt attached to a course
- Students submit work in response to the prompt
- Submissions are recorded by the system

At this stage, the LMS is collecting facts, not making judgments.

### Diagram 3 — Assignments and Submissions

```
[ Instructor ] ── creates ──> [ Assignment ] ── in ──> [ Course ]
                                     │
                                     │ submission
                                     ▼
                                [ Student Work ]
```

A submission is simply a record that a student submitted something at a particular time.

---

## 5. Outcomes and Grades

Finally, instructors evaluate student work.

- Instructors assign a **grade** to a submission
- A grade is a numeric value recorded by the system
- The LMS stores the grade as an outcome

The LMS does not interpret what the grade means. It records that an evaluation occurred.

### Diagram 4 — Outcomes

```
[ Student Work ] ── evaluated by ──> [ Instructor ]
        │
        │ results in
        ▼
     [ Grade ]
```

Grades complete the instructional record for a course.

---

## 6. The Complete Core‑LMS Data Model

When combined, the LMS core consists of a small number of entities and relationships.

### Diagram 5 — Core‑LMS Overview

```
[ Student ] ── enrolls ──┐
                          ▼
                       [ Course ] <── taught by ── [ Instructor ]
                          │
                          │ contains
                          ▼
                 [ Content Items ]
                          │
                          │ includes
                          ▼
                    [ Assignments ]
                          │
                          │ submissions
                          ▼
                   [ Student Work ]
                          │
                          │ graded as
                          ▼
                       [ Grade ]
```

This is the entire instructional core of an LMS.

---

## 7. What Is *Not* Here (By Design)

Notice what is missing:

- Programs and pathways
- Credentials and degrees
- Analytics and engagement metrics
- Personalization engines
- AI tutors or recommendation systems

These may be valuable — but they are **not part of the LMS core**. They sit on top of, or beside, this data.

---

## 8. Why Core‑LMS Matters

Once the LMS is described this way, two things become clear:

1. The LMS core is structurally simple
2. The LMS core is no longer a source of strategic advantage

Core‑LMS exists to make that simplicity visible — and to clarify where genuine innovation in learning technology should actually occur.

---

*End of draft document*

