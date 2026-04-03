# CoreLMS Demonstration Project

## Phase 1 — Execution Plan
**Phase Name:** Project Initialization & First Visible UI  
**Purpose:** Stand up a working Next.js application deployed on Vercel with a live database connection, producing an immediately visible, inspectable UI.

This phase intentionally blends **UI presence** and **backend wiring**. There is no invisible plumbing-only work.

---

## 1. Phase 1 Objectives

By the end of Phase 1, the system should:

- Run locally and in production (Vercel)
- Display a basic UI shell
- Successfully connect to Neon Postgres
- Contain no domain logic beyond placeholders

The goal is confidence, momentum, and early visual feedback.

---

## 2. Scope Boundaries

### Included
- App bootstrapping
- Deployment pipeline
- Global layout
- Placeholder dashboard
- Database connectivity verification

### Explicitly Excluded
- Authentication logic
- Course logic
- Data persistence beyond connection tests

---

## 3. Step-by-Step Execution

### Step 1 — Verify Local Environment

**Actions:**
- Confirm Node.js version compatible with Next.js 16
- Confirm package manager (npm / pnpm) installed

**Deliverable:**
- `node --version` verified
- Project dependencies install cleanly

---

### Step 2 — Verify Repository

**Actions:**
- Confirm the local repository is clean and on the expected `main` branch
- Ensure the GitHub remote exists and points to the project repo

**Deliverable:**
- `main` branch in sync with remote, ready for Phase 1 work

---

### Step 3 — Install Dependencies

**Core dependencies:**
- next
- react / react-dom
- typescript
- tailwindcss
- shadcn/ui
- drizzle-orm
- postgres (or Neon driver)

**Deliverable:**
- App builds and runs locally

---

### Step 4 — Global Layout

**Actions:**
- Implement `app/layout.tsx`
- Add top navigation bar

**UI Deliverable:**
- Visible header with placeholder navigation links

**Notes:**
- Use shadcn components
- No role awareness yet

---

### Step 5 — Landing / Redirect Page

**Actions:**
- Implement `app/page.tsx`
- Redirect users to `/dashboard`

**UI Deliverable:**
- Clean entry point

---

### Step 6 — Dashboard Placeholder

**Actions:**
- Create `app/dashboard/page.tsx`

**UI Deliverable:**
- Card-based placeholder dashboard
- Static text indicating role-based content will appear here

**Purpose:**
- Establish dashboard as central UX anchor

---

### Step 7 — Neon Postgres Connection

**Actions:**
- Create Neon project
- Configure `DATABASE_URL`
- Implement `lib/db.ts`

**Backend Deliverable:**
- Successful connection test on server startup

**Verification:**
- Simple `SELECT 1` executed via server component or script

---

### Step 8 — Deployment to Vercel

**Actions:**
- Connect GitHub repo to Vercel
- Configure environment variables
- Deploy application

**Deliverable:**
- Live URL
- Dashboard visible in production

---

## 4. Validation Checklist

Phase 1 is complete when:

- [ ] App runs locally (`npm run dev`)
- [ ] App builds successfully
- [ ] App deploys to Vercel
- [ ] Global layout renders
- [ ] Dashboard page visible
- [ ] Neon Postgres connection confirmed

---

## 5. Demo Narrative (Phase 1)

At the end of Phase 1, you should be able to say:

> “This is a live LMS shell. It has a real UI, a real deployment, and a real database behind it. Nothing interesting is happening yet—and that’s exactly the point.”

---

## 6. Phase 1 Artifacts

- GitHub repository
- Live Vercel deployment
- Screenshot of dashboard

These artifacts establish credibility early.

---

## 7. Transition to Phase 2

Phase 1 hands off to Phase 2 with:

- A stable UI shell
- A verified backend connection
- Confidence that iteration can proceed rapidly

Phase 2 will introduce **global navigation and route structure**, not new domain logic.

---

**End of Phase 1 Execution Plan**
