# Domain Model

CoreLMS organizes learning around an **activity-centric** hierarchy. A course is composed of modules, each module of sections, and each section of activities. Activities are the unit of learner engagement; assessments (mostly formative) hang off activities.

```mermaid
erDiagram
    USERS ||--o{ ENROLLMENTS : "enrolls in"
    USERS ||--o{ COURSES : "instructs"
    USERS ||--|| USER_PROFILES : has

    COURSES ||--o{ ENROLLMENTS : has
    COURSES ||--o{ MODULES : contains
    COURSES ||--o{ ANNOUNCEMENTS : has

    MODULES ||--o{ SECTIONS : contains
    SECTIONS ||--o{ ACTIVITIES : contains
    ACTIVITIES ||--o{ ASSESSMENTS : "may have 0..n"
    ACTIVITIES ||--o{ COMPLETIONS : "tracked by"
    ACTIVITIES ||--o{ ACTIVITY_NOTES : "annotated by"

    ASSESSMENTS ||--o{ MCQ_QUESTIONS : "(if mcq)"
    ASSESSMENTS ||--o{ SUBMISSIONS : receives
    SUBMISSIONS ||--o| GRADES : "(if graded)"

    USERS ||--o{ SUBMISSIONS : submits
    USERS ||--o{ COMPLETIONS : completes
    USERS ||--o{ ACTIVITY_NOTES : writes

    USERS {
      text id PK
      text email
      enum role "learner|instructor|admin"
    }
    COURSES {
      text id PK
      text title
      text instructorId FK
      bool published
    }
    MODULES {
      text id PK
      text courseId FK
      int order
    }
    SECTIONS {
      text id PK
      text moduleId FK
      int order
    }
    ACTIVITIES {
      text id PK
      text sectionId FK
      enum type "watch|listen|read|write"
      text content
      int order
    }
    ASSESSMENTS {
      text id PK
      text activityId FK
      enum type "open_ended|mcq"
      bool graded "false=formative"
      timestamp dueAt
    }
    MCQ_QUESTIONS {
      text id PK
      text assessmentId FK
      text questionText
      text options
      int correctIndex
    }
    SUBMISSIONS {
      text id PK
      text assessmentId FK
      text userId FK
      text submissionText
      text mcqAnswers
    }
    GRADES {
      text id PK
      text submissionId FK
      int score
      text gradedBy FK
    }
    COMPLETIONS {
      text id PK
      text userId FK
      text activityId FK
    }
    ACTIVITY_NOTES {
      text id PK
      text activityId FK
      text userId FK
      text notes
    }
    ENROLLMENTS {
      text id PK
      text userId FK
      text courseId FK
    }
    ANNOUNCEMENTS {
      text id PK
      text courseId FK
      text authorId FK
    }
    USER_PROFILES {
      text userId PK
      text preferredName
      text bio
    }
```

## Key invariants

- An **activity** has a `type` describing the mode of engagement (`watch`, `listen`, `read`, `write`) — not a content kind. This is what shifts the model from content-centric to activity-centric.
- An activity may have **zero or more assessments**. Most are formative (`graded = false`): scored for feedback, not for the gradebook.
- A **submission** is unique per `(assessment, user)`. A **grade** exists only for submissions to graded assessments.
- A **completion** is recorded per `(user, activity)` — engagement tracking is at the activity level, independent of assessment outcomes.

## Separate subsystem: OpenStax library

Ingested open content lives in its own table family (`openstax_books → openstax_chapters → openstax_sections`) and is used as a *source* for activity content, not as part of the live course delivery hierarchy.
