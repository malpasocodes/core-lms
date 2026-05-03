# Content-Centric vs. Activity-Centric

The typical LMS inherits its shape from the textbook: a course is a stack of *content* (pages, files, videos), with assignments tacked on as separate, gradebook-bound artifacts. CoreLMS replaces that with an **activity-centric** model — the unit a learner engages with is an activity (watch / listen / read / write), and assessments are attached to activities, mostly as formative checks.

## Typical LMS (content-centric)

```mermaid
flowchart TD
    C1[Course] --> M1[Module]
    M1 --> CI1[Content Item<br/>page]
    M1 --> CI2[Content Item<br/>file/video]
    M1 --> CI3[Content Item<br/>link]
    M1 --> A1[Assignment<br/>graded]
    M1 --> A2[Quiz<br/>graded]

    classDef content fill:#fde68a,stroke:#92400e,color:#1f2937;
    classDef assess fill:#fecaca,stroke:#991b1b,color:#1f2937;
    class CI1,CI2,CI3 content;
    class A1,A2 assess;
```

**Properties.**
- Content and assessment are **siblings**, not parent/child. Assessment lives outside the flow of engagement.
- The unit is *what is presented* (a page, a file). Engagement mode is implicit.
- Almost all assessments are summative — they exist to populate the gradebook.
- Authoring mirrors a textbook: chapters of static material, then end-of-chapter problems.

## CoreLMS (activity-centric)

```mermaid
flowchart TD
    C1[Course] --> M1[Module]
    M1 --> S1[Section]
    S1 --> AC1[Activity<br/>watch]
    S1 --> AC2[Activity<br/>read]
    S1 --> AC3[Activity<br/>write]
    AC1 --> AS1[Assessment<br/>mcq · formative]
    AC2 --> AS2[Assessment<br/>mcq · formative]
    AC3 --> AS3[Assessment<br/>open_ended · graded]
    AC3 -.->|optional| AS4[Assessment<br/>open_ended · formative]

    classDef activity fill:#bbf7d0,stroke:#065f46,color:#1f2937;
    classDef formative fill:#bfdbfe,stroke:#1e40af,color:#1f2937;
    classDef graded fill:#fecaca,stroke:#991b1b,color:#1f2937;
    class AC1,AC2,AC3 activity;
    class AS1,AS2,AS4 formative;
    class AS3 graded;
```

**Properties.**
- The unit is **engagement mode** (`watch | listen | read | write`), not content kind.
- Assessments are **children of activities** — they belong to the moment of engagement, not to the gradebook.
- An activity may have **zero or more assessments**; most are formative (`graded = false`): scored for feedback, not weighted into a grade.
- Completion is tracked per *activity* (`completions` table), independent of assessment outcomes — engagement and evaluation are decoupled.

## Side-by-side

| Dimension | Typical LMS | CoreLMS |
|---|---|---|
| Hierarchy | course → module → **content** + assignment | course → module → **section → activity** → assessment |
| Unit of design | content item (page/file) | activity (mode of engagement) |
| Assessment placement | sibling of content, gradebook-bound | child of activity, mostly formative |
| Default assessment intent | summative | formative |
| Completion signal | view content / submit assignment | per-activity completion record |
| Mental model | textbook | practice loop |

## Why it matters for the next steps

The activity-centric model is the foundation for the next set of changes — generative AI and learning science are easier to slot into a structure where:

- Each activity has an explicit **mode** (so AI assistance can be tuned to it: a tutor for `read`, a coach for `write`, a checker for `watch`).
- Formative assessments are **first-class and cheap to add** — exactly where retrieval practice, spaced repetition, and adaptive feedback live.
- Engagement is tracked separately from grading, leaving room for mastery-based or non-grade-bound progressions.
