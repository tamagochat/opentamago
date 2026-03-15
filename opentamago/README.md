# OpenTamago — Development Guide

Turborepo monorepo based on [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).

## Prerequisites

- Node.js 22+ (see `package.json#engines`)
- pnpm 10+
- PostgreSQL database

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Random secret for NextAuth.js
- `AUTH_DISCORD_ID` & `AUTH_DISCORD_SECRET` — Discord OAuth credentials (optional)
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key (optional)

3. Start the database (optional, if using Docker):
```bash
docker compose -f ../infra/docker-compose.yml up -d
```

4. Push database schema:
```bash
pnpm -F @acme/nextjs db:push
```

5. Start the development server:
```bash
pnpm dev:next
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Monorepo Structure

```text
apps/
  nextjs/        — Next.js 15 web app (main app)
  expo/          — Expo mobile app (future)
packages/
  api/           — tRPC v11 router definitions
  auth/          — Authentication
  db/            — Drizzle ORM database (PostgreSQL)
  ui/            — Shared UI components (shadcn/ui)
  validators/    — Shared validation schemas
tooling/
  eslint/        — Shared ESLint config
  prettier/      — Shared Prettier config
  tailwind/      — Shared Tailwind config
  typescript/    — Shared TypeScript config
```

## Commands

```bash
# Monorepo-wide
pnpm dev              # Start all apps
pnpm dev:next         # Start Next.js app only
pnpm build            # Production build
pnpm typecheck        # TypeScript type checking
pnpm lint             # Lint all packages
pnpm format           # Check formatting

# Next.js app (pnpm -F @acme/nextjs <script>)
pnpm -F @acme/nextjs dev           # Start dev server
pnpm -F @acme/nextjs build         # Production build
pnpm -F @acme/nextjs typecheck     # TypeScript type checking
pnpm -F @acme/nextjs i18n:validate # Validate i18n locale files
pnpm -F @acme/nextjs charx:parse   # Parse CharX files
pnpm -F @acme/nextjs db:push       # Push schema to database
pnpm -F @acme/nextjs db:generate   # Generate database migrations
pnpm -F @acme/nextjs db:migrate    # Run migrations
pnpm -F @acme/nextjs db:studio     # Open Drizzle Studio GUI
```

## Architecture

All app code lives in `apps/nextjs/`:

- `src/app/[locale]/` — Next.js App Router pages with i18n support
- `src/server/api/routers/` — tRPC API route definitions
- `src/server/db/schema.ts` — Drizzle ORM database schema
- `src/lib/db/` — RxDB client-side database (IndexedDB)
- `src/i18n/messages/` — Translation files (17 locales)
- `src/components/ui/` — shadcn/ui components

See [CLAUDE.md](../CLAUDE.md) for detailed architecture and patterns.

## tRPC Usage

### Server Components

```tsx
import { api, HydrateClient } from "~/trpc/server";

export default async function Page() {
  const data = await api.example.getData();
  return (
    <HydrateClient>
      <div>{data.message}</div>
    </HydrateClient>
  );
}
```

### Client Components

```tsx
"use client";
import { api } from "~/trpc/react";

export function MyComponent() {
  const { data, isLoading } = api.example.getData.useQuery();
  const mutation = api.example.updateData.useMutation();
  return <div>{isLoading ? "Loading..." : data?.message}</div>;
}
```

### Procedure Types

- **`publicProcedure`** — Unauthenticated endpoints
- **`protectedProcedure`** — Authenticated endpoints (access `ctx.session.user`)

## Internationalization

Supports 17 locales. English is the default (no URL prefix). Other locales use prefixed URLs (`/ko/`, `/ja/`, etc.).

Always use imports from `~/i18n/routing` for locale-aware navigation:

```tsx
import { Link, usePathname, useRouter } from "~/i18n/routing";
```

When adding new translation keys, add to `en.json` first, then all other locale files, and run `pnpm -F @acme/nextjs i18n:validate`.

## Deployment

### Vercel

1. Create a new project on Vercel, set **Root Directory** to `opentamago/apps/nextjs`
2. Add environment variables (`DATABASE_URL`, `AUTH_SECRET`, etc.)
3. Deploy

See the [Turborepo Vercel guide](https://vercel.com/docs/concepts/monorepos/turborepo) for more details.
