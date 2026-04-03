# CoreLMS Demonstration Project

## Phase 3 — Execution Plan
**Phase Name:** Authentication & User Identity (End-to-End)  
**Purpose:** Introduce real users, persistent identity, and roles into the system while keeping the UX and backend logic minimal and transparent.

Phase 3 is the first phase where the system begins to store *institutionally meaningful data*. It is therefore intentionally conservative.

---

## 1. Phase 3 Objectives

By the end of Phase 3, the system should:

- Support real user registration and login
- Persist users in the database
- Establish session-based authentication
- Introduce user roles (Learner / Instructor)
- Make identity available throughout the UI

This phase unlocks all subsequent LMS functionality.

---

## 2. Scope Boundaries

### Included
- User table and schema
- Email + password authentication
- Session management
- Role assignment
- Auth-aware UI rendering

### Explicitly Excluded
- OAuth / SSO
- Password reset flows
- Multi-factor authentication
- External identity providers
- Enterprise auth integrations

These are intentionally out of scope.

---

## 3. Data Model Introduced in This Phase

### 3.1 User Table

Fields:
- `id`
- `email`
- `password_hash`
- `role` ("learner" | "instructor" | "admin")
- `created_at`

Notes:
- One role per user
- No role switching in v0.1
- `admin` is operational only and cannot be self-selected during registration (seed/DB insert only)

---

### 3.2 Session Table (if using DB-backed sessions)

Fields:
- `id`
- `user_id`
- `expires_at`

Alternatively, sessions may be implemented using signed cookies with server-side validation.

---

## 4. Step-by-Step Execution

### Step 1 — Database Schema Setup

**Actions:**
- Define User schema in `db/schema.ts` (role enum includes `admin`)
- Define Session schema in `db/schema.ts`
- Generate and apply migration

**Deliverable:**
- User and Session tables exist in Neon Postgres

---

### Step 2 — Password Handling

**Actions:**
- Add password hashing utility (`bcrypt`, cost 12)

**Deliverable:**
- Secure password storage

---

### Step 3 — Registration Flow

**Actions:**
- Implement registration server action
- Persist new users
- Enforce unique email, min password length (8)
- Role selection limited to `learner` or `instructor`

**UI Deliverable:**
- Functional registration form at `/auth/register`

---

### Step 4 — Login Flow

**Actions:**
- Implement login server action
- Validate credentials
- Create session

**UI Deliverable:**
- Functional login form at `/auth/login`

---

### Step 5 — Session Management

**Actions:**
- Store session identifier in HTTP-only cookie
- Use DB-backed sessions (Postgres) with 7-day TTL
- Cookie settings: name `corelms_session`, httpOnly, secure (prod), sameSite=lax, path=/
- Implement session lookup helper in `lib/auth.ts`

**Backend Deliverable:**
- `getCurrentUser()` helper

---

### Step 6 — Logout Flow

**Actions:**
- Implement logout server action
- Clear session

**UI Deliverable:**
- Logout link in navigation works

---

### Step 7 — Auth-Aware Navigation

**Actions:**
- Update global layout to:
  - Show login/register when logged out
  - Show logout when logged in
  - Show admin link when role is `admin`
- Derive auth state server-side via `getCurrentUser()`

**UI Deliverable:**
- Navigation reflects auth state

---

### Step 8 — Role Assignment and Checks

**Actions:**
- Assign role at registration (toggle between learner/instructor)
- Admin role seeded manually (no UI)
- Implement role guard helper

**Backend Deliverable:**
- `requireInstructor()` / `requireLearner()` / `requireAdmin()` helpers

---

### Step 9 — Dashboard Identity Integration

**Actions:**
- Update dashboard to display:
  - User email
  - User role

**UI Deliverable:**
- Dashboard clearly reflects logged-in identity

---

## 5. Validation Checklist

Phase 3 is complete when:

- [ ] Users can register
- [ ] Users can log in
- [ ] Sessions persist across requests
- [ ] Users can log out
- [ ] Roles are stored and readable
- [ ] Navigation reflects auth state
- [ ] Dashboard displays user identity
- [ ] Admin role exists (seed/manual) and admin link is gated

---

## 6. Demo Narrative (Phase 3)

At the end of Phase 3, you should be able to say:

> “We now have real users with persistent identity and roles. Everything that follows—courses, enrollments, grades—will be recorded against these users.”

This marks the transition from a shell to a real system of record.

---

## 7. Security Posture (Explicitly Limited)

Included:
- Password hashing
- HTTP-only cookies
- Server-side role checks

Excluded:
- Advanced security hardening
- Compliance guarantees
- Audit logging

This is sufficient for a demonstration environment.

---

## 8. Transition to Phase 4

Phase 3 enables Phase 4 by:

- Providing authenticated users
- Providing role context
- Allowing role-aware dashboards

Phase 4 will introduce **role-differentiated dashboards and course ownership views**.

---

**End of Phase 3 Execution Plan**
