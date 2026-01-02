import { relations } from "drizzle-orm";
import { index, pgTableCreator, primaryKey } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `opentamago_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ]
);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .$defaultFn(() => /* @__PURE__ */ new Date()),
  image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// P2P File Sharing
export const fileShareChannels = createTable(
  "file_share_channel",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    shortSlug: d.varchar({ length: 8 }).notNull().unique(),
    longSlug: d.varchar({ length: 128 }).notNull().unique(),
    secret: d.uuid().notNull(),
    uploaderPeerId: d.varchar({ length: 64 }).notNull(),
    userId: d.varchar({ length: 255 }).references(() => users.id),
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
  ]
);

export const fileShareChannelsRelations = relations(
  fileShareChannels,
  ({ one }) => ({
    user: one(users, {
      fields: [fileShareChannels.userId],
      references: [users.id],
    }),
  })
);

// Connect Sessions (Multi-Character P2P Chat)
export const connectSessions = createTable(
  "connect_session",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    shortSlug: d.varchar({ length: 8 }).notNull().unique(),
    longSlug: d.varchar({ length: 128 }).notNull().unique(),
    hostPeerId: d.varchar({ length: 64 }).notNull(),
    hostUserId: d.varchar({ length: 255 }).references(() => users.id),
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
  ]
);

export const connectSessionsRelations = relations(
  connectSessions,
  ({ one, many }) => ({
    host: one(users, {
      fields: [connectSessions.hostUserId],
      references: [users.id],
    }),
    participants: many(connectParticipants),
  })
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
    characterAvatar: d.text(), // Base64 thumbnail
    isHost: d.boolean().default(false),
    joinedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    leftAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [index("connect_participant_session_idx").on(t.sessionId)]
);

export const connectParticipantsRelations = relations(
  connectParticipants,
  ({ one }) => ({
    session: one(connectSessions, {
      fields: [connectParticipants.sessionId],
      references: [connectSessions.id],
    }),
  })
);
