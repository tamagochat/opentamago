import { pgTableCreator } from "drizzle-orm/pg-core";

const createTable = pgTableCreator((name) => `opentamago_${name}`);

export const user = createTable("user", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  name: t.text().notNull(),
  email: t.text().notNull().unique(),
  emailVerified: t.boolean().notNull(),
  image: t.text(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
}));

export const session = createTable("session", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  expiresAt: t.timestamp().notNull(),
  token: t.text().notNull().unique(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
  ipAddress: t.text(),
  userAgent: t.text(),
  userId: t
    .uuid()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}));

export const account = createTable("account", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  accountId: t.text().notNull(),
  providerId: t.text().notNull(),
  userId: t
    .uuid()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: t.text(),
  refreshToken: t.text(),
  idToken: t.text(),
  accessTokenExpiresAt: t.timestamp(),
  refreshTokenExpiresAt: t.timestamp(),
  scope: t.text(),
  password: t.text(),
  createdAt: t.timestamp().notNull(),
  updatedAt: t.timestamp().notNull(),
}));

export const verification = createTable("verification", (t) => ({
  id: t.uuid().primaryKey().defaultRandom(),
  identifier: t.text().notNull(),
  value: t.text().notNull(),
  expiresAt: t.timestamp().notNull(),
  createdAt: t.timestamp(),
  updatedAt: t.timestamp(),
}));
