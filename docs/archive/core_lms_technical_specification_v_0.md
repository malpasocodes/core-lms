# CoreLMS Demonstration Project

## Technical Specification
**Version:** v0.1  
**Status:** Draft (Demonstration Project)

---

## 1. Purpose of This Document

This technical specification describes how the CoreLMS demonstration project will be implemented. Its purpose is not to optimize for scale, performance, or extensibility, but to make the **technical simplicity and low operational burden** of a core LMS explicit and inspectable.

The architecture choices are intentionally conservative, modern, and managed. They reinforce the central claim of the project: *the core LMS is now cheap and easy to build, even using contemporary cloud infrastructure.*

---

## 2. Architectural Overview

CoreLMS is implemented as a **single, logically monolithic web application** deployed on managed infrastructure.

High-level architecture:

```
Browser
  ↓
Next.js (Node.js runtime on Vercel)
  ↓
Server Components / Server Actions
  ↓
Neon Postgres (managed database)
  ↓
Managed file storage
```

There are no microservices, background workers, queues, or event pipelines.

---

## 3. Core Architectural Principles

- **Monolithic by design**: one application, one deployment unit
- **Server-first**: minimal client-side logic
- **Managed infrastructure**: minimize operational overhead
- **Explicit simplicity**: fewer abstractions, fewer dependencies
- **Inspectability**: logic should be readable by a generalist developer

---

## 4. Runtime and Framework

### 4.1 Framework
- **Next.js (App Router)**

Rationale:
- Provides routing, rendering, and server execution in one framework
- Allows backend logic to live alongside UI
- Eliminates the need for a separate API service

---

### 4.2 Runtime
- **Node.js runtime (Vercel)**

Constraints:
- No Edge runtime usage in v0.1
- Avoid long-running processes
- All requests are stateless

---

## 5. Backend Execution Model

### 5.1 Server Components

Used for:
- Reading data
- Rendering pages
- Enforcing access control

Server Components are responsible for:
- Fetching course data
- Fetching content items
- Rendering grade views

---

### 5.2 Server Actions

Used for:
- Mutations and state changes

Examples:
- Creating courses
- Enrolling users
- Submitting assignments
- Recording grades

Server Actions replace a traditional REST API layer.

---

## 6. Database Layer

### 6.1 Database
- **Neon Postgres**

Rationale:
- Fully managed Postgres
- Durable storage
- Free or low-cost tier
- No database administration required

---

### 6.2 ORM / Query Layer

- **Drizzle ORM** (preferred)

Rationale:
- Lightweight
- SQL-first
- Minimal abstraction

Prisma is an acceptable alternative if developer clarity is prioritized over minimalism.

---

### 6.3 Data Model Characteristics

- Relational schema
- Explicit foreign keys
- Minimal normalization
- No polymorphic tables

The data model mirrors the functional scope defined in the PRD.

---

## 7. Authentication and Authorization

### 7.1 Authentication

- Email and password authentication
- Session-based login

Sessions:
- Stored in Postgres
- Identified via HTTP-only cookies

---

### 7.2 Authorization

- Role-based access control
- Two roles only:
  - Learner
  - Instructor

Authorization is enforced:
- In server components
- In server actions

---

## 8. File Storage

### 8.1 Use Cases

- Assignment submissions
- Course resources

---

### 8.2 Storage Strategy

- Managed blob storage (e.g., Vercel Blob or S3-compatible storage)
- Files stored externally
- File metadata stored in Postgres

Constraints:
- Small file sizes
- No streaming or processing pipelines

---

## 9. Frontend Architecture

### 9.1 Rendering Model

- Server-rendered pages
- Minimal client-side JavaScript

---

### 9.2 UI Technology

- React (via Next.js)
- Simple HTML forms
- Minimal CSS

No client-side state management libraries are used.

---

## 10. Error Handling and Logging

- Rely on Vercel-provided logging
- Console-based logging only
- No centralized observability platform

Errors are handled at the page or action level.

---

## 11. Environment Configuration

- Environment variables managed via Vercel
- Separate environments:
  - Local development
  - Preview
  - Production

Secrets:
- Database connection string
- Session secret

---

## 12. Deployment Model

- Continuous deployment via GitHub → Vercel
- Every commit triggers a build
- Preview deployments for inspection

No manual infrastructure provisioning is required.

---

## 13. Performance and Scaling Assumptions

The system assumes:
- Small user counts
- Low concurrency
- Modest data volumes

Performance optimization and horizontal scaling are explicitly out of scope.

---

## 14. Security Considerations

Included:
- Password hashing
- Session-based auth
- Role checks

Excluded:
- Penetration testing
- Advanced threat modeling
- Compliance certifications

Security is sufficient for a demonstration environment.

---

## 15. Technical Non-Goals

The following are intentionally excluded:
- Microservices
- Background workers
- Message queues
- WebSockets or realtime features
- Analytics pipelines
- AI or ML components
- External system integrations

---

## 16. Summary

The CoreLMS technical architecture is deliberately unambitious. It uses modern managed infrastructure not to demonstrate sophistication, but to show that even with convenience-first tooling, the core LMS remains a low-cost, low-complexity system.

This architecture exists to support a demonstration argument, not to optimize for growth or differentiation.

---

**End of Technical Specification**

