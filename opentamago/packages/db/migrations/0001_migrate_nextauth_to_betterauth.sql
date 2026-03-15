-- Migration: NextAuth -> Better Auth + Add Feedback table + Drop Post table
--
-- Converts existing NextAuth-style opentamago_* auth tables to Better Auth format
-- with UUID primary keys, adds opentamago_feedback, and removes the leftover post table.
--
-- IMPORTANT: Back up your database before running this migration.
-- Run with: psql $DATABASE_URL -f migrations/0001_migrate_nextauth_to_betterauth.sql

BEGIN;

-- ============================================================
-- 0. DROP LEFTOVER POST TABLE
-- ============================================================

DROP TABLE IF EXISTS "post" CASCADE;

-- ============================================================
-- 1. DROP SESSION + VERIFICATION (will be recreated from scratch)
--    Must happen before user.id type change since they have FKs.
-- ============================================================

DROP TABLE IF EXISTS "opentamago_session" CASCADE;
DROP TABLE IF EXISTS "opentamago_verification_token" CASCADE;

-- ============================================================
-- 2. SAVE ACCOUNT DATA then drop (incompatible schema + FK)
-- ============================================================

CREATE TEMP TABLE "_account_backup" AS
SELECT
  "provider_account_id" AS account_id,
  "provider" AS provider_id,
  "user_id",
  "access_token",
  "refresh_token",
  "id_token",
  "expires_at",
  "scope"
FROM "opentamago_account";

DROP TABLE "opentamago_account" CASCADE;

-- ============================================================
-- 3. DROP FKs from dependent tables (dynamic to handle any name)
-- ============================================================

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'opentamago_file_share_channel'::regclass
      AND contype = 'f'
      AND confrelid = 'opentamago_user'::regclass
  LOOP
    EXECUTE format('ALTER TABLE "opentamago_file_share_channel" DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'opentamago_connect_session'::regclass
      AND contype = 'f'
      AND confrelid = 'opentamago_user'::regclass
  LOOP
    EXECUTE format('ALTER TABLE "opentamago_connect_session" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- ============================================================
-- 4. CONVERT USER TABLE
-- ============================================================

-- Add timestamps
ALTER TABLE "opentamago_user"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

-- Convert emailVerified: timestamp -> boolean
ALTER TABLE "opentamago_user"
  ADD COLUMN IF NOT EXISTS "email_verified_bool" boolean NOT NULL DEFAULT false;

UPDATE "opentamago_user"
  SET "email_verified_bool" = ("email_verified" IS NOT NULL);

ALTER TABLE "opentamago_user" DROP COLUMN IF EXISTS "email_verified";
ALTER TABLE "opentamago_user" RENAME COLUMN "email_verified_bool" TO "email_verified";

-- Ensure name is NOT NULL
UPDATE "opentamago_user" SET "name" = '' WHERE "name" IS NULL;
ALTER TABLE "opentamago_user" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "opentamago_user" ALTER COLUMN "name" TYPE text;
ALTER TABLE "opentamago_user" ALTER COLUMN "email" TYPE text;
ALTER TABLE "opentamago_user" ALTER COLUMN "image" TYPE text;

-- Convert id: varchar -> uuid
ALTER TABLE "opentamago_user" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "opentamago_user" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "opentamago_user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Unique email constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opentamago_user_email_unique'
  ) THEN
    ALTER TABLE "opentamago_user" ADD CONSTRAINT "opentamago_user_email_unique" UNIQUE ("email");
  END IF;
END $$;

-- ============================================================
-- 5. RECREATE SESSION TABLE (Better Auth format)
-- ============================================================

CREATE TABLE "opentamago_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" uuid NOT NULL REFERENCES "opentamago_user"("id") ON DELETE CASCADE
);

-- ============================================================
-- 6. RECREATE ACCOUNT TABLE (Better Auth format) + restore data
-- ============================================================

CREATE TABLE "opentamago_account" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "opentamago_user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

INSERT INTO "opentamago_account" (
  "id", "account_id", "provider_id", "user_id",
  "access_token", "refresh_token", "id_token",
  "access_token_expires_at", "scope", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  account_id,
  provider_id,
  user_id::uuid,
  access_token,
  refresh_token,
  id_token,
  CASE WHEN expires_at IS NOT NULL THEN to_timestamp(expires_at) ELSE NULL END,
  scope,
  now(),
  now()
FROM "_account_backup";

DROP TABLE "_account_backup";

-- ============================================================
-- 7. VERIFICATION TABLE (Better Auth format)
-- ============================================================

CREATE TABLE "opentamago_verification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);

-- ============================================================
-- 8. FEEDBACK TABLE (new)
-- ============================================================

CREATE TABLE "opentamago_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "opentamago_user"("id") ON DELETE CASCADE,
  "type" varchar(32) NOT NULL,
  "message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. Convert FK columns in dependent tables to uuid + re-add FKs
-- ============================================================

ALTER TABLE "opentamago_file_share_channel"
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;

ALTER TABLE "opentamago_file_share_channel"
  ADD CONSTRAINT "opentamago_file_share_channel_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "opentamago_user"("id");

ALTER TABLE "opentamago_connect_session"
  ALTER COLUMN "host_user_id" TYPE uuid USING "host_user_id"::uuid;

ALTER TABLE "opentamago_connect_session"
  ADD CONSTRAINT "opentamago_connect_session_host_user_id_fk"
  FOREIGN KEY ("host_user_id") REFERENCES "opentamago_user"("id");

COMMIT;
