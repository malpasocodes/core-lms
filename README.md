# CoreLMS

A minimalist Learning Management System demonstrating that core LMS functionality is a commodity. Built to show how much of a traditional LMS can be replaced by a small, modern stack.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19 Server Components
- **Language:** TypeScript
- **Database:** PostgreSQL on Neon with Drizzle ORM
- **Auth:** Clerk (roles in `publicMetadata.role`)
- **Styling:** Tailwind CSS 4 with Radix UI / shadcn components
- **Icons:** HugeIcons

## Features

- Role-based access for **learners**, **instructors**, and **admins**
- Course → module → section → activity content hierarchy
- Activity types: watch, listen, read, write
- Assessments: open-ended and auto-graded MCQ
- Per-activity completions and learner notes
- Instructor gradebook and managed enrollment
- Admin tools for roster, ingestion, and app settings
- OpenStax content library ingestion

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon recommended)
- A Clerk account for authentication

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local   # then fill in the values below

# Run database migrations
npm run db:migrate

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Environment Variables

```
DATABASE_URL=                          # Neon Postgres connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply migrations to the database
```

## Project Structure

```
app/                # Next.js App Router pages
components/ui/      # Reusable UI components (shadcn-based)
lib/                # Server actions, auth, schema, db helpers
drizzle/            # SQL migration files
scripts/            # Database migration and ingestion scripts
docs/               # UI/UX specs and roadmaps
```

## Deployment

Optimized for [Vercel](https://vercel.com). Set the environment variables above in your project settings and deploy from the GitHub repo.

## License

MIT
