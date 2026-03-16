-- Migration: Drop Post table, add Feedback table, convert user.id to uuid
--
-- - Drops the leftover T3 boilerplate "post" table
-- - Converts opentamago_user.id from varchar(255) to uuid
-- - Updates all FK columns referencing user.id to uuid
-- - Creates opentamago_feedback table
--
-- Auth tables (session, account, verification_token) keep NextAuth format.
-- The shared packages/db auth-schema uses Better Auth format for other apps.
--
-- IMPORTANT: Back up your database before running this migration.
-- Run with: psql $POSTGRES_URL -f migrations/0001_migrate_nextauth_to_betterauth.sql

BEGIN;

-- ============================================================
-- 0. DROP LEFTOVER POST TABLE
-- ============================================================

DROP TABLE IF EXISTS "post" CASCADE;

-- ============================================================
-- 1. CONVERT USER ID: varchar(255) -> uuid
-- ============================================================

-- Drop all FKs referencing opentamago_user.id
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'opentamago_user'
      AND ccu.column_name = 'id'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

-- Convert user id
ALTER TABLE "opentamago_user" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "opentamago_user" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "opentamago_user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Convert FK columns to uuid and re-add constraints
ALTER TABLE "opentamago_account" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "opentamago_account"
  ADD CONSTRAINT "opentamago_account_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "opentamago_user"("id");

ALTER TABLE "opentamago_session" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "opentamago_session"
  ADD CONSTRAINT "opentamago_session_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "opentamago_user"("id");

ALTER TABLE "opentamago_file_share_channel" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
ALTER TABLE "opentamago_file_share_channel"
  ADD CONSTRAINT "opentamago_file_share_channel_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "opentamago_user"("id");

ALTER TABLE "opentamago_connect_session" ALTER COLUMN "host_user_id" TYPE uuid USING "host_user_id"::uuid;
ALTER TABLE "opentamago_connect_session"
  ADD CONSTRAINT "opentamago_connect_session_host_user_id_fk"
  FOREIGN KEY ("host_user_id") REFERENCES "opentamago_user"("id");

-- ============================================================
-- 2. FEEDBACK TABLE (new)
-- ============================================================

CREATE TABLE "opentamago_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "opentamago_user"("id") ON DELETE CASCADE,
  "feedback_type" varchar(32) NOT NULL,
  "message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

COMMIT;
