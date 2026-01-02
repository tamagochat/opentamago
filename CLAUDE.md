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

## Client-Side Database (RxDB)

Uses RxDB with IndexedDB (Dexie) for client-side storage. Schemas are in `src/lib/db/schemas/`.

### Schema Migration Steps

When modifying an existing RxDB schema:

1. **Increment schema version** in the schema file:
   ```ts
   // src/lib/db/schemas/settings.ts
   export const settingsSchema: RxJsonSchema<SettingsDocument> = {
     version: 1,  // Increment from 0 to 1
     // ... rest of schema
   };
   ```

2. **Add migration strategy** in `src/lib/db/index.ts`:
   ```ts
   await db.addCollections({
     settings: {
       schema: settingsSchema,
       migrationStrategies: {
         // Migration from version 0 to 1
         1: (oldDoc: any) => {
           return {
             ...oldDoc,
             newField: "defaultValue",  // Add new fields with defaults
           };
         },
         // Future migrations: 2, 3, etc.
       },
     },
   });
   ```

3. **Update TypeScript interface** to include new fields:
   ```ts
   export interface SettingsDocument {
     // ... existing fields
     newField: string;  // Add new field
   }
   ```

4. **Update hooks** in `src/lib/db/hooks/` to handle defaults for missing fields (backward compatibility).

### Migration Tips

- **Adding optional fields**: Set default in migration, make field optional in interface
- **Removing fields**: Just remove from interface; old data is ignored
- **Renaming fields**: Copy value to new key, delete old key in migration
- **Breaking changes**: If migration isn't possible, the app auto-resets the database (user loses local data)

### Files

- `src/lib/db/index.ts` - Database initialization and migrations
- `src/lib/db/schemas/` - Schema definitions
- `src/lib/db/hooks/` - React hooks for database access
