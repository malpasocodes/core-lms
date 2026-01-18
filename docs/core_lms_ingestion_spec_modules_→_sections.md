# CoreLMS Ingestion Specification

## Purpose

This document specifies the **minimal CoreLMS data model and ingestion process** required to consume normalized academic content (e.g. `finance_normalized.json`) and materialize it as a navigable course.

The intent is to demonstrate that **CoreLMS is content-neutral**: it owns structure and execution, not authorship or pedagogy.

---

## Design Principle

> **CoreLMS manages structure, ordering, navigation, and execution.**  
> **It does not care how content was authored or generated.**

All content is treated as an opaque payload attached to a Section.

---

## Canonical Course Structure

```
Course
 └── Module*
      └── Section*
           └── ContentPayload (opaque)
```

---

## Core Data Model (Logical Schema)

### Course

```
Course {
  id
  title
  description?
  source_metadata?
  created_at
}
```

Notes:
- A Course is a container for Modules
- `source_metadata` may reference the origin of imported content

---

### Module

```
Module {
  id
  course_id
  title
  position
  source_ref?
}
```

Notes:
- `position` defines ordering within the course
- `source_ref` may reference a chapter identifier

---

### Section

```
Section {
  id
  module_id
  title
  position
  content_payload
  content_type
  source_ref?
}
```

Notes:
- `content_payload` is opaque to CoreLMS
- `content_type` indicates how the payload should be rendered
- CoreLMS does not interpret or validate semantic meaning

---

## Content Payload Contract

### Requirements

- Payload must be renderable by a registered renderer
- Payload must be immutable once ingested (unless explicitly replaced)
- Payload may contain text, placeholders, or structured blocks

### Example (Text-Based Payload)

```json
{
  "blocks": [
    { "type": "paragraph", "text": "Finance studies the allocation of resources..." },
    { "type": "placeholder", "label": "Figure 1.2", "caption": "Cash flow diagram" }
  ]
}
```

CoreLMS treats this payload as data, not content.

---

## Ingestion Input

### Normalized Source File

```
finance_normalized.json
```

Expected structure (simplified):

```json
{
  "source": "Finance Textbook",
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Introduction to Finance",
      "sections": [
        {
          "section_number": "1.1",
          "title": "What Is Finance?",
          "blocks": [...]
        }
      ]
    }
  ]
}
```

---

## Ingestion Process

### Functional Definition

```
f2 : NormalizedJSON → Course(Modules → Sections)
```

---

### Step 1 — Create Course

- Create a Course record
- Populate title and source metadata

---

### Step 2 — Create Modules

For each chapter in `finance_normalized.json`:

- Create a Module
- `title` ← chapter title
- `position` ← chapter order
- `source_ref` ← chapter number

---

### Step 3 — Create Sections

For each section within a chapter:

- Create a Section
- `title` ← section title
- `position` ← section order
- `content_payload` ← section blocks
- `content_type` ← e.g. `normalized_text`
- `source_ref` ← section number

---

## Invariants

CoreLMS must enforce:

1. **Stable ordering** (Modules and Sections)
2. **No semantic interpretation of content**
3. **Content-source agnosticism**
4. **Deterministic ingestion** (same input → same structure)

---

## Out of Scope

- Learning objectives
- Assessments
- Student enrollment
- Grading
- Content editing UX
- AI generation logic

These belong to later phases or external systems.

---

## User-Visible Result

After ingestion:

- A Course appears in CoreLMS
- Modules correspond to chapters
- Sections correspond to chapter sections
- Clicking a Section renders its content payload

From the user’s perspective, this is a fully navigable course.

---

## Summary

This specification defines the **minimum viable CoreLMS ingestion capability**. By reducing CoreLMS to Modules → Sections with opaque content payloads, the system remains stable while allowing unlimited flexibility in how academic content is produced.

This separation is intentional and foundational.

