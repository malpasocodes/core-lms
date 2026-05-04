# CoreLMS

CoreLMS is a small, open Learning Management System — and an experiment.

It exists to make two arguments, one with code and one with what comes next.

## The first argument: the LMS is a commodity

The "core" functionality of a Learning Management System — courses, modules, activities, assessments, enrollments, grades, announcements, roles, permissions — is now easily replicable by a single developer using AI-agentic tools. CoreLMS is the working proof. The full feature set lives in this repository, under an MIT license, free for anyone to use, fork, study, or replace.

If the basic LMS is a commodity, the interesting question is no longer *can we build one*. It is *what should we build instead*.

## The second argument: the LMS, as conceived, is an architectural dead end

After three decades of LMS adoption, these systems still have very little to do with teaching and learning. They manage courses. They manage files. They manage assignments, grades, announcements, enrollments, and permissions. Those things matter — but they are not the same as advancing teaching and learning.

A different architecture is needed. That work is long-term, and even if it materializes, institutions will not transition overnight. So there needs to be a Plan B.

**Plan B is to evolve the Learning Management System.** CoreLMS is the testbed for that evolution.

The questions this project wants to explore:

- How can AI be used not merely to automate administration, but to support teaching?
- How can learning science be built into the architecture rather than sprinkled on top as an afterthought?
- Can a system built to manage courses become something that genuinely helps improve teaching and learning?

## Status

Early. The codebase is a working LMS; the research agenda on top of it is just beginning. Expect things to change.

## Contributing

CoreLMS is looking for collaborators. If the argument resonates with you — as a developer, educator, learning scientist, instructional designer, or institutional leader — please get in touch. The goal is not simply to build another LMS. The goal is to use a simple, open system as a testbed for rethinking what learning software should do.

Open an issue to introduce yourself, share an idea, or suggest a direction.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with React 19 Server Components
- **Language:** TypeScript
- **Database:** PostgreSQL on Neon with Drizzle ORM
- **Auth:** Clerk (roles in `publicMetadata.role`)
- **Styling:** Tailwind CSS 4 with Radix UI / shadcn components
- **Icons:** HugeIcons

## What's in the box today

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

MIT — see [LICENSE](./LICENSE).
