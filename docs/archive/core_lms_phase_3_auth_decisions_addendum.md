# CoreLMS Demonstration Project

## Phase 3 — Authentication Decisions Addendum
**Purpose:** Resolve implementation ambiguities raised during review and make Phase 3 fully reproducible, deploy-safe, and unambiguous.

This addendum intentionally *locks decisions*. Where trade‑offs exist, the simplest viable option is chosen in service of the demonstration goal.

---

## 1. Environment Variables & Configuration

Required environment variables (all environments):

```text
DATABASE_URL=postgres://...
SESSION_SECRET=long-random-string
```

Notes:
- `SESSION_SECRET` is used to sign and verify session identifiers.
- Secrets are managed via Vercel Environment Variables for Preview and Production.

---

## 2. Session Strategy (Chosen)

**Decision:** Use **DB-backed sessions** stored in Postgres.

### Rationale
- Fully inspectable
- Easy to invalidate
- Avoids cryptographic complexity
- Aligns with LMS-as-record framing

### Session Model

```text
Session
- id (random UUID)
- user_id
- expires_at
- created_at
```

### Cookie Settings

- Name: `corelms_session`
- `httpOnly: true`
- `secure: true` (production)
- `sameSite: "lax"`
- `path: /`

### Expiration Policy

- Default session lifetime: **7 days**
- Expired sessions are rejected on lookup
- Cleanup via:
  - lazy deletion on access, or
  - manual script (no background jobs)

### Invalidation & Rotation

- Logout deletes the session row
- New login creates a new session ID
- No session rotation beyond re-login

---

## 3. Password Handling

**Library:** `bcrypt`

### Parameters
- Cost factor: **12**

### Registration Rules
- Minimum length: 8 characters
- No additional complexity rules (demo scope)
- Email must be unique (DB constraint + server check)

### Error Handling
- Duplicate email → registration error
- Invalid credentials → generic login error (no enumeration)

---

## 4. Role Assignment

**Decision:** Role is chosen at registration via a simple toggle.

Allowed values:
- `learner`
- `instructor`

Constraints:
- One role per user
- Role **cannot be changed** in v0.1

### Enforcement

- Role checks occur:
  - In **server actions** (mutations)
  - In **server components** (page access)

No client-side role logic is trusted.

---

## 5. Auth State Derivation (Server-First)

**Canonical helper:** `getCurrentUser()` in `lib/auth.ts`

Used by:
- `app/layout.tsx`
- Dashboard page
- All role-protected routes

Rules:
- Auth state is derived **only on the server**
- No duplicate client-side auth state
- No suspense-based auth resolution

---

## 6. Migrations Strategy

**Tooling:** Drizzle ORM

### Workflow

- Schema defined in `db/schema.ts`
- Migrations generated locally
- Migrations applied:
  - locally via CLI
  - in production via Vercel build step or manual command

### Phase 3 Migrations

- `users` table
- `sessions` table

Schema changes are explicit and versioned.

---

## 7. CSRF Posture

**Decision:** Rely on **sameSite=lax cookies + POST-only server actions**.

Details:
- All mutations use POST via Server Actions
- Session cookie is not sent on cross-site POSTs
- No additional CSRF token mechanism introduced

This is acceptable for a demonstration system.

---

## 8. Summary of Locked Decisions

| Area | Decision |
|----|----|
| Sessions | DB-backed sessions |
| Cookies | httpOnly, secure, sameSite=lax |
| Passwords | bcrypt (cost 12) |
| Roles | Selected at registration, immutable |
| Auth state | Server-derived only |
| Migrations | Drizzle, explicit |
| CSRF | sameSite + POST-only |

These decisions remove ambiguity and allow Phase 3 to be implemented cleanly and consistently.

---

**End of Addendum**
