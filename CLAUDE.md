# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenTamago is a full-stack TypeScript monorepo built with Turborepo. The main application is a Next.js 15 app for AI character interaction, with shared packages for auth, database, and API.

## Monorepo Structure

```
opentamago/                    # Turborepo root
├── apps/
│   ├── nextjs/                # Main Next.js 15 app (T3 Stack)
│   ├── tanstack-start/        # Tanstack Start app (experimental)
│   └── expo/                  # React Native/Expo app (experimental)
├── packages/
│   ├── api/                   # Shared tRPC router definitions (@acme/api)
│   ├── auth/                  # Better Auth config (@acme/auth)
│   ├── db/                    # Shared Drizzle ORM schema (@acme/db)
│   ├── ui/                    # Shared UI components (@acme/ui)
│   ├── validators/            # Shared Zod schemas (@acme/validators)
│   └── ...                    # eslint, prettier, tailwind, typescript configs
├── infra/                     # Docker compose for local Postgres
└── backup/                    # Legacy single-app backup (deprecated)
```

## Commands

Run from the monorepo root (`opentamago/`):

```bash
pnpm dev              # Start all apps with Turbo
pnpm dev:next         # Start only the Next.js app
pnpm build            # Production build (all packages)
pnpm typecheck        # TypeScript type checking (all packages)
pnpm lint             # ESLint (all packages)
pnpm format           # Prettier check
```

Next.js app commands (run from `apps/nextjs/` or use `pnpm -F @acme/nextjs`):

```bash
pnpm i18n:validate             # Validate i18n locale files match en.json
pnpm with-env drizzle-kit push # Push schema to database
pnpm with-env drizzle-kit studio # Open Drizzle Studio GUI
```

Shared DB commands (run from `packages/db/`):

```bash
pnpm push             # Push shared schema to database
pnpm studio           # Open Drizzle Studio for shared schema
```

## Architecture

### Next.js App (`apps/nextjs/`)

The primary application, built with the T3 Stack (Next.js 15, tRPC, Drizzle ORM, NextAuth.js, Tailwind CSS).

#### Directory Structure

- `src/app/[locale]/` - Locale-aware pages (17 locales)
- `src/components/` - React components
  - `ui/` - shadcn/ui base components (Radix UI)
  - `layout/` - Header, footer, main layout
- `src/server/` - Backend code
  - `api/root.ts` - tRPC router (p2p, connect, feedback)
  - `api/trpc.ts` - tRPC init, `publicProcedure`, `protectedProcedure`
  - `api/routers/` - Individual tRPC routers
  - `auth/` - NextAuth.js config (Discord OAuth, DrizzleAdapter)
  - `db/schema.ts` - Drizzle schema (NextAuth-compatible auth tables)
- `src/trpc/` - tRPC client setup (server.ts, react.tsx)
- `src/lib/db/` - Client-side RxDB (IndexedDB via Dexie)
- `src/i18n/messages/` - Translation JSON files (17 locales)
- `src/env.js` - Environment variable validation (Zod)

#### Key Patterns

**tRPC**: `publicProcedure` for unauthenticated, `protectedProcedure` for authenticated (guarantees `ctx.session.user`).

**Data Fetching**: Server components use `api` from `src/trpc/server.ts`; client components use `api` from `src/trpc/react.tsx`.

**Path Alias**: `~/` maps to `src/` (e.g., `import { db } from "~/server/db"`).

### Shared Packages

**`@acme/db`** (`packages/db/`):
- `src/auth-schema.ts` - Better Auth-compatible auth tables (for tanstack-start, expo)
- `src/schema.ts` - Shared tables (feedback) + re-exports auth-schema
- `src/client.ts` - Vercel Postgres + Drizzle client
- All tables use `opentamago_` prefix via `pgTableCreator`

**`@acme/auth`** (`packages/auth/`):
- Better Auth wrapper with Discord OAuth, Expo plugin, UUID generation
- Used by tanstack-start and expo apps
- CLI for schema generation: `pnpm generate`

**`@acme/api`** (`packages/api/`):
- Shared tRPC routers (auth, feedback) for non-Next.js apps

### Database

PostgreSQL with Drizzle ORM. All tables prefixed with `opentamago_`.

**Two auth systems coexist:**
- Next.js app: **NextAuth.js** with `@auth/drizzle-adapter` (tables: user, account, session, verification_token)
- Other apps: **Better Auth** via `@acme/auth` package (tables: user, account, session, verification)

**Schema conventions:**
- User IDs are `uuid` with `defaultRandom()`
- NextAuth account table uses composite PK `(provider, providerAccountId)` with userId FK
- `feedbackType` column (not `type`) to avoid reserved keyword conflicts

**Migration files:** `packages/db/migrations/`

### Docker (Local Development)

```bash
cd infra/
POSTGRES_PORT=5432 docker compose up -d   # Start Postgres
```

Default credentials: `postgres` / `password` / database `opentamago`

## Internationalization (i18n)

Uses `next-intl` with 17 locales. English is the default (no URL prefix).

**Locales:** en, ko, ja, zh-CN, zh-TW, id, vi, es, pt, de, fr, tr, ru, nl, pl, th, hi

**Navigation**: Always use `Link`, `usePathname`, `useRouter` from `~/i18n/routing`.

**Server Components**: `getTranslations` from `next-intl/server`
**Client Components**: `useTranslations` from `next-intl`

**Adding new translation keys:**
1. Add to `en.json` first
2. Add to all 16 other locale files
3. Run `pnpm i18n:validate` (also runs on pre-push hook)

### Translation Guidelines

- Keep placeholder variables intact: `{name}`, `{count}`
- Preserve HTML tags: `<link>`, `<br>`
- Technical terms (API, QR, P2P) stay in English
- Korean: 해요체 | Japanese: です/ます | Chinese: formal but accessible
- See full per-language guidelines in locale files

## Client-Side Database (RxDB)

Uses RxDB with IndexedDB (Dexie) in `apps/nextjs/src/lib/db/`.

**Critical Dexie.js constraints:**
- Only `required` fields can be indexed (DXE1 error otherwise)
- Indexed string fields MUST have `maxLength` (SC34 error)
- Indexed number fields MUST have `multipleOf` (SC35 error)

See `src/lib/db/schemas/` for schema definitions and `src/lib/db/hooks/` for React hooks.

## SEO

- Use Next.js Metadata API (`metadata` / `generateMetadata`)
- `<html lang>` set via `LangSetter` component
- Include `title`, `description`, `openGraph`, `twitter` in metadata
