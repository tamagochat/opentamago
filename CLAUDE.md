# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenTamago is a full-stack TypeScript application built with the T3 Stack (Next.js 15, tRPC, Drizzle ORM, NextAuth.js, Tailwind CSS).

## Commands

```bash
pnpm dev           # Start dev server with Turbo
pnpm build         # Production build
pnpm typecheck     # TypeScript type checking
pnpm i18n:validate # Validate i18n locale files match en.json
pnpm db:push       # Push schema to database
pnpm db:generate   # Generate database migrations
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Drizzle Studio GUI
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

### Locale Validation

A pre-push git hook validates that all locale files have the same keys as `en.json`. This prevents missing translations from being pushed.

```bash
pnpm i18n:validate                 # Validate all locales
pnpm i18n:validate --locale ja     # Validate only Japanese
pnpm i18n:validate --locale ja ko  # Validate Japanese and Korean
```

**When adding new translation keys:**
1. Add the key to `en.json` first (English is the reference locale)
2. Add the same key to all other locale files in `src/i18n/messages/`
3. Run `pnpm i18n:validate` to verify all locales are in sync

**Validation checks:**
- Missing keys (in English but not in other locales)
- Extra keys (in other locales but not in English)
- JSON syntax errors

The validation script is at `scripts/validate-i18n.ts` and the hook is configured in `.husky/pre-push`.

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

### Critical Dexie.js RxStorage Constraints

**IMPORTANT**: When using Dexie.js storage (IndexedDB), you MUST follow these rules to avoid initialization errors:

1. **Non-required fields CANNOT be indexed**
   - Only fields in the `required` array can be added to `indexes`
   - Optional fields (not in `required`) will cause DXE1 error if indexed
   - Error: "non-required index fields are not possible with the dexie.js RxStorage"

   ```ts
   // ❌ WRONG - personaId is optional but indexed
   export const chatSchema: RxJsonSchema<ChatDocument> = {
     properties: {
       personaId: { type: "string", maxLength: 36 }
     },
     required: ["id", "characterId"],  // personaId NOT required
     indexes: ["characterId", "personaId"],  // ❌ ERROR!
   };

   // ✅ CORRECT - only required fields are indexed
   export const chatSchema: RxJsonSchema<ChatDocument> = {
     properties: {
       personaId: { type: "string", maxLength: 36 }
     },
     required: ["id", "characterId"],
     indexes: ["characterId"],  // ✅ Only index required fields
   };
   ```

2. **String fields used in indexes MUST have maxLength**
   - Any string field in an index must define `maxLength` property
   - Error code: SC34
   - This applies to all string fields, including those in compound indexes
   - **BEST PRACTICE**: Add `maxLength` to ALL string fields, not just indexed ones

   ```ts
   // ❌ WRONG - indexed string field without maxLength
   properties: {
     characterId: { type: "string" }  // ❌ Missing maxLength
   },
   indexes: ["characterId"]

   // ❌ WRONG - compound index with missing maxLength
   properties: {
     sessionId: { type: "string" },  // ❌ Missing maxLength
     timestamp: { type: "number" }
   },
   indexes: [["sessionId", "timestamp"]]  // ❌ ERROR! sessionId needs maxLength

   // ✅ CORRECT - indexed string field with maxLength
   properties: {
     characterId: { type: "string", maxLength: 36 }  // ✅ Has maxLength
   },
   indexes: ["characterId"]

   // ✅ CORRECT - compound index with maxLength
   properties: {
     sessionId: { type: "string", maxLength: 100 },  // ✅ Has maxLength
     timestamp: { type: "number" }
   },
   indexes: [["sessionId", "timestamp"]]
   ```

   **Common maxLength values:**
   - UUID/GUID fields: `maxLength: 36`
   - Peer IDs, Session IDs: `maxLength: 100`
   - URLs, slugs: `maxLength: 200` or `maxLength: 500`
   - Names: `maxLength: 500`
   - Long text fields (not indexed): can omit `maxLength`

3. **Number/Integer fields used in indexes MUST have multipleOf**
   - Any number/integer field in an index must define `multipleOf` property
   - Error code: SC35
   - This applies to all number fields, including those in compound indexes
   - **BEST PRACTICE**: Add `multipleOf`, `minimum`, and `maximum` to ALL number fields

   ```ts
   // ❌ WRONG - indexed number field without multipleOf
   properties: {
     timestamp: { type: "number" }  // ❌ Missing multipleOf
   },
   indexes: [["sessionId", "timestamp"]]

   // ✅ CORRECT - indexed number field with multipleOf
   properties: {
     timestamp: {
       type: "number",
       multipleOf: 1,  // ✅ Has multipleOf (integers)
       minimum: 0,
       maximum: 9999999999999
     }
   },
   indexes: [["sessionId", "timestamp"]]

   // ✅ CORRECT - decimal number field
   properties: {
     price: {
       type: "number",
       multipleOf: 0.01,  // ✅ For decimals (cents)
       minimum: 0,
       maximum: 999999
     }
   }
   ```

   **Common multipleOf values:**
   - Integer timestamps: `multipleOf: 1`
   - Decimal prices/percentages: `multipleOf: 0.01`
   - Floating point: `multipleOf: 0.01` or smaller

4. **Query optional fields without indexes**
   - If you need to query by optional fields, use `.find()` with selectors
   - Performance will be slower without indexes, but it won't cause errors

   ```ts
   // Query by optional personaId without index
   const chats = await db.chats
     .find({ selector: { personaId: "some-id" } })
     .exec();
   ```

### Schema Validation Checklist

Before creating or modifying a schema, verify:
- [ ] All indexed fields are in the `required` array (if required)
- [ ] **CRITICAL**: All indexed string fields have `maxLength` defined
- [ ] **CRITICAL**: All indexed number fields have `multipleOf` defined
- [ ] All fields in compound indexes have proper constraints (maxLength/multipleOf)
- [ ] Migration strategy is added to `src/lib/db/index.ts` (if incrementing version)
- [ ] TypeScript interface matches schema properties
- [ ] Run `pnpm typecheck` to verify type safety
- [ ] Test database initialization in browser (refresh to verify no SC34/SC35/DXE1 errors)

### Quick Error Fixes

**SC34 Error** - String field in index missing `maxLength`:
1. Find the field name in the error message
2. Add `maxLength` to that field:
   ```ts
   fieldName: { type: "string", maxLength: 100 }
   ```
3. If compound index, check ALL string fields
4. Refresh browser to verify

**SC35 Error** - Number field in index missing `multipleOf`:
1. Find the field name in the error message
2. Add `multipleOf` to that field:
   ```ts
   fieldName: {
     type: "number",
     multipleOf: 1,  // Use 1 for integers, 0.01 for decimals
     minimum: 0,
     maximum: 9999999999999
   }
   ```
3. If compound index, check ALL number fields
4. Refresh browser to verify

### Files

- `src/lib/db/index.ts` - Database initialization and migrations
- `src/lib/db/schemas/` - Schema definitions
- `src/lib/db/hooks/` - React hooks for database access
- `docs/rxdb-maintenance.md` - Development vs Production maintenance guide

### Development vs Production

**Development mode** (NODE_ENV=development):
- RxDBDevModePlugin enabled (validates schemas, catches errors)
- AJV validation wrapper enabled (validates all documents)
- Dev-mode warnings suppressed via `disableWarnings()`
- Hot reload support via global caching

**Production mode** (NODE_ENV=production):
- Dev plugin tree-shaken out (smaller bundle, better performance)
- No validation overhead (~2-3x faster)
- Same reliability with optimized performance

**Expected console warnings in dev:**
- "RxDB Open Core RxStorage" - Informational, can ignore (free Dexie.js storage)
- These warnings are normal and won't appear in production builds

See `docs/rxdb-maintenance.md` for full guide on maintaining RxDB across environments.
