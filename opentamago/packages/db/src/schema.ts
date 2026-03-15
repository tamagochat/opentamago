import { pgTableCreator } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

const createTable = pgTableCreator((name) => `opentamago_${name}`);

export const feedback = createTable("feedback", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t
    .uuid()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: t.varchar({ length: 32 }).notNull(),
  message: t.text(),
  createdAt: t.timestamp({ withTimezone: true }).defaultNow().notNull(),
}));

export * from "./auth-schema";
