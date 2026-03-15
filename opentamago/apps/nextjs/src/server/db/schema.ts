import { relations } from "drizzle-orm";
import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * Multi-project schema: all tables prefixed with "opentamago_".
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `opentamago_${name}`);

// ============================================================
// Auth tables (Better Auth compatible)
// ============================================================

export const users = createTable("user", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  name: d.text().notNull(),
  email: d.text().notNull().unique(),
  emailVerified: d.boolean().notNull().default(false),
  image: d.text(),
  createdAt: d.timestamp().notNull().defaultNow(),
  updatedAt: d.timestamp().notNull().defaultNow(),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  feedback: many(feedback),
}));

export const sessions = createTable("session", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  expiresAt: d.timestamp().notNull(),
  token: d.text().notNull().unique(),
  createdAt: d.timestamp().notNull().defaultNow(),
  updatedAt: d.timestamp().notNull().defaultNow(),
  ipAddress: d.text(),
  userAgent: d.text(),
  userId: d
    .uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    accountId: d.text().notNull(),
    providerId: d.text().notNull(),
    userId: d
      .uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: d.text(),
    refreshToken: d.text(),
    idToken: d.text(),
    accessTokenExpiresAt: d.timestamp(),
    refreshTokenExpiresAt: d.timestamp(),
    scope: d.text(),
    password: d.text(),
    createdAt: d.timestamp().notNull().defaultNow(),
    updatedAt: d.timestamp().notNull().defaultNow(),
  }),
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const verificationTokens = createTable("verification", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  identifier: d.text().notNull(),
  value: d.text().notNull(),
  expiresAt: d.timestamp().notNull(),
  createdAt: d.timestamp(),
  updatedAt: d.timestamp(),
}));

// ============================================================
// P2P File Sharing
// ============================================================

export const fileShareChannels = createTable(
  "file_share_channel",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    shortSlug: d.varchar({ length: 8 }).notNull().unique(),
    longSlug: d.varchar({ length: 128 }).notNull().unique(),
    secret: d.uuid().notNull(),
    uploaderPeerId: d.varchar({ length: 64 }).notNull(),
    userId: d.uuid().references(() => users.id),
    fileName: d.varchar({ length: 255 }),
    fileSize: d.bigint({ mode: "number" }).default(0),
    hasPassword: d.boolean().default(false),
    passwordHash: d.varchar({ length: 255 }),
    expiresAt: d.timestamp({ withTimezone: true }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastRenewedAt: d
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
    user: one(users, {
      fields: [fileShareChannels.userId],
      references: [users.id],
    }),
  }),
);

// ============================================================
// Connect Sessions (Multi-Character P2P Chat)
// ============================================================

export const connectSessions = createTable(
  "connect_session",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    shortSlug: d.varchar({ length: 8 }).notNull().unique(),
    longSlug: d.varchar({ length: 128 }).notNull().unique(),
    hostPeerId: d.varchar({ length: 64 }).notNull(),
    hostUserId: d.uuid().references(() => users.id),
    passwordHash: d.varchar({ length: 128 }),
    maxParticipants: d.integer().default(8),
    isPublic: d.boolean().default(false),
    expiresAt: d.timestamp({ withTimezone: true }).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    lastActivityAt: d
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
    host: one(users, {
      fields: [connectSessions.hostUserId],
      references: [users.id],
    }),
    participants: many(connectParticipants),
  }),
);

export const connectParticipants = createTable(
  "connect_participant",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    sessionId: d
      .integer()
      .notNull()
      .references(() => connectSessions.id, { onDelete: "cascade" }),
    peerId: d.varchar({ length: 64 }).notNull(),
    characterName: d.varchar({ length: 255 }).notNull(),
    characterAvatar: d.text(),
    isHost: d.boolean().default(false),
    joinedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    leftAt: d.timestamp({ withTimezone: true }),
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

// ============================================================
// Feedback
// ============================================================

export const feedback = createTable("feedback", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  userId: d
    .uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: d.varchar({ length: 32 }).notNull(),
  message: d.text(),
  createdAt: d.timestamp({ withTimezone: true }).notNull().defaultNow(),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
}));
