# App Template Spec

A starting-point blueprint for building a new app modeled on this one. Focuses on UI shape, layout, and the shared patterns — not feature-specific logic.

## Concept

A single-user productivity/notebook-style web app with:
- A sidebar-driven multi-section workspace
- Server-rendered pages with interactive islands for dynamic UI
- An AI layer that turns natural-language input into structured actions
- A Postgres-backed data model with a small set of related tables

Aesthetic target: Notion meets Linear — clean, calm, text-forward, neutral palette with a single accent color.

## Tech Stack

- **Framework**: Astro (SSR) with React islands
- **Styling**: Tailwind CSS v4 (`@theme` tokens in `global.css`)
- **DB**: Neon (serverless Postgres) + Drizzle ORM
- **AI**: Anthropic Claude API (Sonnet) for NLP features
- **Auth**: Clerk (Astro integration)
- **Deploy**: Netlify or Vercel

## Project Layout

```
src/
  layouts/Layout.astro        # Sidebar + main content shell (used by every page)
  pages/
    index.astro               # Dashboard (home)
    <section>.astro           # One page per top-level section
    <section>/[id].astro      # Detail view
    api/                      # REST endpoints (CRUD per resource)
    api/ai/                   # AI endpoints
  components/                 # React islands (.tsx)
  db/
    client.ts                 # Drizzle client
    schema.ts                 # All tables in one file
  styles/global.css           # Tailwind import + theme tokens
  middleware.ts               # Auth gate
```

## Layout Shell (`Layout.astro`)

Two-column flex layout, full viewport height:

- **Left sidebar** — `w-64`, white background, right border, sticky full-height
  - Brand block at top (title + subtitle)
  - Nav list: icon + label per item, rounded pill highlight on active route
  - Active state: `bg-accent-50 text-accent-700`
  - Inactive: `text-slate-600 hover:bg-slate-100`
  - Sign-out button pinned to the bottom
- **Main content** — `flex-1`, scrollable, inner container `max-w-6xl mx-auto p-8`

Nav items are defined as a single array `[{ href, label, icon }, …]` — add a new section by adding one entry plus a matching page file.

## Page Pattern

Every top-level page follows the same shape:

```astro
---
import Layout from '../layouts/Layout.astro';
import MySectionView from '../components/MySectionView';
// fetch initial data server-side from Drizzle
---
<Layout title="My Section">
  <MySectionView client:load initialData={serialize(data)} />
</Layout>
```

- Data is fetched server-side, serialized, and passed as props to the island
- The island owns local state and re-fetches via `/api/...` after mutations
- Date fields are serialized to ISO strings before crossing the boundary

## Dashboard Pattern

The home page is always the dashboard. It's a two-column grid (`lg:grid-cols-3`):

- **Left (2/3)**: primary list(s) with overdue/today grouping, then a "Quick Add" stack
- **Right (1/3)**: sidebar widgets — active items, calendar preview, AI briefings
- **Top**: a single natural-language input bar that routes to the AI parse endpoint
- **Bottom (full width)**: pattern/insights panel

## Design Tokens (`global.css`)

```css
@theme {
  --color-accent-50  … --color-accent-900;   /* single accent ramp */
  --color-priority-low/medium/high/urgent;   /* semantic status ramp */
  --color-mood-great/good/neutral/tough/blocked;
}
```

- Body: `bg-slate-50 text-slate-900`
- Cards: `bg-white border border-slate-200 rounded-lg p-3/p-4`
- Hover: `hover:border-accent-300`
- Section headings: `text-sm font-semibold text-slate-700 mb-3`
- Page heading: `text-2xl font-bold text-slate-900`
- Secondary text: `text-slate-400 / text-slate-500`
- System font stack (no custom webfont)

Pick one accent color (this app uses teal) and swap the ramp; leave the semantic ramps as-is.

## Data Model Shape

Keep it small — 4–6 tables, each with: `id` (uuid), timestamps, a `status` enum, and one FK to tie resources together. Example schema from this app:

| Table | Purpose |
|---|---|
| `projects` | top-level containers (name, type, status) |
| `todos` | tasks (title, due_date, priority, status, project_id?) |
| `logbook_entries` | dated project journal (project_id, content, mood, tags[]) |
| `conversations` | AI chat log (role, content, action_taken jsonb) |
| `user_preferences` | key/value jsonb store |

For a new app, keep the "one parent + dated children + freeform notes + prefs" template and rename.

## API Pattern

REST per resource under `src/pages/api/<resource>/`:
- `index.ts` — GET list, POST create
- `[id].ts` — GET, PUT, DELETE

AI endpoints under `src/pages/api/ai/` follow a fixed shape:
1. Receive user input
2. Fetch relevant DB context
3. Build system prompt + user prompt
4. Call Claude
5. Parse structured JSON response (`{ action, data, confidence, clarification? }`)
6. Return to client

## Componentization Conventions

- One React component per file, PascalCase filename
- `QuickAdd*` components for inline-create forms
- `*List` / `*Timeline` / `*Editor` / `*Detail` naming for views
- `*Insights` / `*Review` / `*Plan` naming for AI-generated panels
- Components take serialized DB rows + callback props; no direct DB access

## Build Commands

```bash
npm install
npm run dev
npx drizzle-kit push        # apply schema to DB
npx drizzle-kit generate    # create migration files
```

## Environment

```
DATABASE_URL=…       # Neon Postgres connection string
ANTHROPIC_API_KEY=…  # Claude API
# + Clerk keys if using auth
```

## Adopting This Template for a New App

1. Copy the repo, rename in `package.json` and `Layout.astro` brand block
2. Replace the `navItems` array with the new section list
3. Redefine tables in `src/db/schema.ts` (keep the id/timestamps/status pattern)
4. For each section: create `<section>.astro` + a matching React view + `api/<section>/` CRUD routes
5. Keep the Dashboard as a home-grid of widgets pulling from the new tables
6. Swap the accent ramp in `global.css` if you want a different tint
7. Add AI features last, one endpoint at a time, using the parse → fetch → prompt → parse shape
