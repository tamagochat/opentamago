DROP TABLE "opentamago_post" CASCADE;--> statement-breakpoint
ALTER TABLE "opentamago_connect_session" ADD COLUMN "passwordHash" varchar(128);