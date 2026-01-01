# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenTamago is a full-stack TypeScript application built with the T3 Stack (Next.js 15, tRPC, Drizzle ORM, NextAuth.js, Tailwind CSS).

## Commands

```bash
pnpm dev          # Start dev server with Turbo
pnpm build        # Production build
pnpm typecheck    # TypeScript type checking
pnpm db:push      # Push schema to database
pnpm db:generate  # Generate database migrations
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio GUI
```

## Architecture

### Directory Structure

- `src/app/` - Next.js App Router pages and API routes
  - `[locale]/` - Locale-aware pages (en, ko, ja)
  - `_components/` - Shared React components (private, not routable)
  - `api/auth/[...nextauth]/` - NextAuth.js route handler
  - `api/trpc/[trpc]/` - tRPC HTTP endpoint
- `src/server/` - Backend code
  - `api/root.ts` - Main tRPC router combining all sub-routers
  - `api/trpc.ts` - tRPC initialization, context, middleware
  - `api/routers/` - Individual tRPC route definitions
  - `auth/` - NextAuth.js configuration (Discord OAuth)
  - `db/schema.ts` - Drizzle ORM schema definitions
- `src/trpc/` - tRPC client setup
  - `server.ts` - React Server Component client
  - `react.tsx` - Client-side tRPC provider with React Query
- `src/lib/utils.ts` - `cn()` helper for Tailwind class merging
- `src/env.js` - Environment variable validation with Zod

### Key Patterns

**tRPC Procedures**: Use `publicProcedure` for unauthenticated endpoints, `protectedProcedure` for authenticated. Protected procedures access `ctx.session.user`.

**Data Fetching**:
- Server components: Use `api` from `src/trpc/server.ts` with `HydrateClient`
- Client components: Use `api` from `src/trpc/react.tsx` with React Query hooks

**Database**: PostgreSQL with Drizzle ORM. All tables prefixed with `opentamago_`. Use `src/server/db/index.ts` for database client.

**Path Alias**: Use `~/` to import from `src/` (e.g., `import { db } from "~/server/db"`)

## Internationalization (i18n)

Uses `next-intl` with a hybrid URL structure:
- `/` - English (default, no prefix)
- `/ko/` - Korean
- `/ja/` - Japanese

### Directory Structure

- `src/i18n/` - i18n configuration
  - `config.ts` - Locale definitions and names
  - `routing.ts` - next-intl routing config, exports `Link`, `usePathname`, `useRouter`
  - `request.ts` - Server-side i18n request config
  - `messages/` - Translation JSON files (`en.json`, `ko.json`, `ja.json`)
- `src/app/[locale]/` - All pages under locale route group

### Key Patterns

**Navigation**: Always use `Link`, `usePathname`, `useRouter` from `~/i18n/routing` instead of `next/navigation` for locale-aware navigation.

**Server Components**: Use `getTranslations` from `next-intl/server`:
```tsx
import { getTranslations } from "next-intl/server";
const t = await getTranslations("namespace");
```

**Client Components**: Use `useTranslations` hook:
```tsx
"use client";
import { useTranslations } from "next-intl";
const t = useTranslations("namespace");
```

**Adding New Pages**: All pages must be under `src/app/[locale]/` and call `setRequestLocale(locale)` for static rendering.

## SEO Requirements

### Metadata

- Define `metadata` export in page/layout files using Next.js Metadata API
- Include `title`, `description`, `openGraph`, and `twitter` properties
- Use dynamic metadata with `generateMetadata` for locale-specific content

### Locale-specific SEO

- `<html lang={locale}>` is set dynamically via `LangSetter` component in `[locale]/layout.tsx`
- Add `alternates.languages` for hreflang tags when needed
- Ensure all user-facing text is translatable via i18n messages
