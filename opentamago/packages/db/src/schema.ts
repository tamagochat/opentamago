import { relations } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

const createTable = pgTableCreator((name) => `opentamago_${name}`);

export const feedback = createTable("feedback", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  feedbackType: t.varchar({ length: 32 }).notNull(),
  message: t.text(),
  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
}));

// P2P File Sharing
export const fileShareChannels = createTable(
  "file_share_channel",
  (t) => ({
    id: t.integer().primaryKey().generatedByDefaultAsIdentity(),
    shortSlug: t.varchar({ length: 8 }).notNull().unique(),
    longSlug: t.varchar({ length: 128 }).notNull().unique(),
    secret: t.uuid().notNull(),
    uploaderPeerId: t.varchar({ length: 64 }).notNull(),
    userId: t.uuid().references(() => user.id),
    fileName: t.varchar({ length: 255 }),
    fileSize: t.bigint({ mode: "number" }).default(0),
    hasPassword: t.boolean().default(false),
    passwordHash: t.varchar({ length: 255 }),
    expiresAt: t.timestamp({ withTimezone: true }).notNull(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastRenewedAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("file_share_short_slug_idx").on(t.shortSlug),
    index("file_share_long_slug_idx").on(t.longSlug),
    index("file_share_expires_at_idx").on(t.expiresAt),
  ],
);

export const fileShareChannelsRelations = relations(
  fileShareChannels,
  ({ one }) => ({
    user: one(user, {
      fields: [fileShareChannels.userId],
      references: [user.id],
    }),
  }),
);

// Connect Sessions (Multi-Character P2P Chat)
export const connectSessions = createTable(
  "connect_session",
  (t) => ({
    id: t.integer().primaryKey().generatedByDefaultAsIdentity(),
    shortSlug: t.varchar({ length: 8 }).notNull().unique(),
    longSlug: t.varchar({ length: 128 }).notNull().unique(),
    hostPeerId: t.varchar({ length: 64 }).notNull(),
    hostUserId: t.uuid().references(() => user.id),
    passwordHash: t.varchar({ length: 128 }),
    maxParticipants: t.integer().default(8),
    isPublic: t.boolean().default(false),
    expiresAt: t.timestamp({ withTimezone: true }).notNull(),
    createdAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastActivityAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("connect_short_slug_idx").on(t.shortSlug),
    index("connect_long_slug_idx").on(t.longSlug),
    index("connect_expires_at_idx").on(t.expiresAt),
  ],
);

export const connectSessionsRelations = relations(
  connectSessions,
  ({ one, many }) => ({
    host: one(user, {
      fields: [connectSessions.hostUserId],
      references: [user.id],
    }),
    participants: many(connectParticipants),
  }),
);

export const connectParticipants = createTable(
  "connect_participant",
  (t) => ({
    id: t.integer().primaryKey().generatedByDefaultAsIdentity(),
    sessionId: t
      .integer()
      .notNull()
      .references(() => connectSessions.id, { onDelete: "cascade" }),
    peerId: t.varchar({ length: 64 }).notNull(),
    characterName: t.varchar({ length: 255 }).notNull(),
    characterAvatar: t.text(),
    isHost: t.boolean().default(false),
    joinedAt: t
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    leftAt: t.timestamp({ withTimezone: true }),
  }),
  (t) => [index("connect_participant_session_idx").on(t.sessionId)],
);

export const connectParticipantsRelations = relations(
  connectParticipants,
  ({ one }) => ({
    session: one(connectSessions, {
      fields: [connectParticipants.sessionId],
      references: [connectSessions.id],
    }),
  }),
);

export * from "./auth-schema";
