# CoreLMS Demonstration Project

## Administrator Role Addendum
**Applies to:** Phase 3 (Authentication & User Identity)  
**Purpose:** Introduce an Administrator role while preserving the minimal, infrastructure-oriented nature of CoreLMS.

This addendum extends—not complicates—the existing role model. The administrator role is treated as **operational**, not pedagogical.

---

## 1. Rationale for an Administrator Role

While CoreLMS deliberately limits pedagogical and organizational complexity, a minimal **administrator** role is required to:

- Bootstrap the system
- Manage users during a demonstration
- Perform basic operational oversight

The administrator role exists to support *system operation*, not learning.

---

## 2. Updated Role Model

CoreLMS now supports **three roles**:

| Role | Purpose |
|---|---|
| Learner | Consumes content, submits work |
| Instructor | Creates courses, grades work |
| Administrator | Manages users and system state |

No additional roles are introduced.

---

## 3. Role Semantics (Important Distinction)

- **Learner** and **Instructor** are *learning roles*
- **Administrator** is an *operational role*

Administrators:
- Do **not** teach
- Do **not** enroll as learners
- Do **not** participate in course activity by default

They exist outside the learning flow.

---

## 4. Role Assignment Rules

### Initial Assignment

- Administrator accounts are created **manually**:
  - via seed script, or
  - via direct database insertion

Administrators **cannot be self-selected** during registration.

---

### Registration Flow (Updated)

- Public registration supports:
  - `learner`
  - `instructor`

- `administrator` is excluded from the registration UI

---

### Role Mutability

- Roles are **immutable** in v0.1
- Changing a role requires:
  - database update, or
  - seed script

No role management UI is introduced.

---

## 5. Authorization Rules

### Administrator Capabilities

Administrators may:
- View all users
- View all courses
- Perform basic data inspection

Administrators may **not**:
- Modify course content (unless explicitly acting as instructor)
- Override grades
- Change pedagogical logic

---

### Enforcement

Role enforcement is server-side only:

- Server Actions
- Server Components

Helpers:
- `requireAdmin()`
- `requireInstructor()`
- `requireLearner()`

No client-side role trust.

---

## 6. UI Implications

### Navigation

When logged in as Administrator:
- Navigation shows:
  - Dashboard
  - Admin (placeholder)
  - Logout

Admin pages are minimal and text-oriented.

---

### Admin Dashboard (Minimal)

Initial admin UI may include:
- User list (read-only)
- Course list (read-only)

No admin workflows beyond inspection are required in v0.1.

---

## 7. Data Model Impact

### User Table (Updated)

```text
User
- id
- email
- password_hash
- role ("learner" | "instructor" | "admin")
- created_at
```

No additional tables are required.

---

## 8. Alignment with CoreLMS Principles

Adding an administrator role:

- Does **not** introduce pedagogical complexity
- Does **not** add new LMS primitives
- Does **not** weaken the commoditization argument

Instead, it reinforces the distinction between:
- learning infrastructure, and
- organizational operations

---

## 9. Summary of Changes

| Area | Update |
|---|---|
| Roles | Added `admin` |
| Registration | Admin excluded |
| Enforcement | Server-only guards |
| UI | Minimal admin view |
| Scope | Operational only |

---

**End of Administrator Role Addendum**
