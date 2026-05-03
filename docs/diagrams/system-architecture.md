# System Architecture

CoreLMS is a Next.js 16 App Router application. There is **no REST API layer** — mutations flow through React Server Actions directly into Drizzle/Postgres. Authentication is delegated to Clerk; webhooks sync user state into the local `users` table.

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI["React 19 UI<br/>(Server + Client Components)"]
    end

    subgraph Edge["Next.js Edge / Middleware"]
        MW["middleware.ts<br/>Clerk auth gate<br/>+ approval check"]
    end

    subgraph Server["Next.js Server Runtime"]
        RSC["Server Components<br/>app/**/page.tsx"]
        SA["Server Actions<br/>lib/*-actions.ts"]
        AUTH["lib/auth.ts<br/>requireUser / requireAdmin /<br/>requireInstructor / requireLearner"]
        WH["app/api/webhooks/clerk<br/>(svix verified)"]
    end

    subgraph External["External Services"]
        CLERK["Clerk<br/>identity + sessions<br/>publicMetadata.role"]
        NEON[("Neon Postgres<br/>via @neondatabase/serverless")]
        R2["Cloudflare R2<br/>file uploads<br/>(lib/r2.ts)"]
        OS["OpenStax CNX archive<br/>(lib/openstax-client.ts)"]
    end

    UI -->|"page nav"| MW
    UI -->|"form action"| MW
    MW -->|"authorized"| RSC
    MW -->|"authorized form"| SA
    MW -.->|"unauth"| CLERK

    RSC --> AUTH
    SA --> AUTH
    AUTH --> CLERK

    RSC -->|"Drizzle ORM"| NEON
    SA -->|"Drizzle ORM"| NEON
    SA --> R2

    CLERK -->|"user.created /<br/>user.updated"| WH
    WH -->|"upsert user"| NEON

    SA -.->|"ingest content"| OS
    OS -.->|"books / chapters / sections"| NEON

    RSC -->|"HTML stream"| UI
    SA -->|"redirect()<br/>+ revalidate"| UI
```

## Request lifecycle

1. **Request enters middleware.** `middleware.ts` runs Clerk's auth gate. Public routes (`/`, `/sign-in`, `/sign-up`) pass through. Authenticated users without `publicMetadata.approved` are redirected to `/pending-approval`.
2. **Server Component renders.** Page-level components in `app/**/page.tsx` call `requireUser()` / `requireAdmin()` / etc. from `lib/auth.ts`, then read from Postgres via Drizzle, and stream HTML to the browser.
3. **Mutations via Server Actions.** Forms post to functions in `lib/*-actions.ts` (e.g. `course-actions.ts`, `assessment-actions.ts`). Each action re-checks auth, performs Drizzle writes, and ends with `redirect("/path?notice=...")`.
4. **Identity sync.** Clerk fires webhooks to `app/api/webhooks/clerk`; svix verifies the signature and `lib/user-sync.ts` upserts the local `users` row.
5. **External content.** The admin "ingest" flow pulls OpenStax content into the `openstax_*` tables for later use as activity material.

## Layer responsibilities

| Layer | Path | Responsibility |
|---|---|---|
| Routing / SSR | `app/` | Server-rendered pages, layouts, route handlers |
| Auth gate | `middleware.ts`, `lib/auth.ts` | Session, role, approval checks |
| Mutations | `lib/*-actions.ts` | Server Actions — the only write path |
| Data access | `lib/db.ts`, `lib/schema.ts` | Drizzle client + table definitions |
| Storage | `lib/r2.ts` | File uploads to Cloudflare R2 |
| Ingestion | `lib/openstax-client.ts`, `lib/ingest-actions.ts` | Pull external content |
| UI primitives | `components/ui/` | shadcn-based components |

## What's absent (intentionally)

- **No REST/GraphQL API.** Server Actions replace it.
- **No client-side state library.** Server Components + form submissions cover the surface.
- **No sessions table.** Clerk owns sessions; the local `users` table only mirrors identity for foreign-key integrity.
