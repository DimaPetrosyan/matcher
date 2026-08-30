import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const community = pgTable("community", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  title: text("title").notNull(),
  tgChatId: bigint("tg_chat_id", { mode: "number" }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
})

export const appUser = pgTable("app_user", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  tgId: bigint("tg_id", { mode: "number" }).notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  languageCode: text("language_code"),
  source: text("source").notNull().default("direct"),
  status: text("status").notNull().default("onboarding"),
  consentAt: timestamp("consent_at", { withTimezone: true }),
  consentVersion: text("consent_version"),
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
})

export const userCommunity = pgTable(
  "user_community",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => community.id, { onDelete: "cascade" }),
    created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [primaryKey({ columns: [t.userId, t.communityId] })],
)

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    type: text("type").notNull(),
    userId: uuid("user_id").references(() => appUser.id, { onDelete: "set null" }),
    payload: jsonb("payload").notNull().default({}),
    created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index("audit_log_created_type_idx").on(t.created, t.type)],
)

export type CommunityRow = typeof community.$inferSelect
