import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const interestKey = pgEnum("interest_key", [
  "bar",
  "run",
  "movie",
  "expo",
  "bike",
  "volley",
  "karaoke",
  "tennis",
  "padel",
  "billiards",
])

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
  onboardingStep: text("onboarding_step").notNull().default("interests"),
  wizardMessageId: bigint("wizard_message_id", { mode: "number" }),
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

export const interest = pgTable("interest", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`),
  key: interestKey("key").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
})

export const userInterest = pgTable(
  "user_interest",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    interestId: uuid("interest_id")
      .notNull()
      .references(() => interest.id, { onDelete: "cascade" }),
    recurrence: text("recurrence"),
    startTime: time("start_time"),
    endTime: time("end_time"),
    created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [
    uniqueIndex("user_interest_slot_uidx").on(t.userId, t.interestId, t.recurrence, t.startTime),
  ],
)

export const interestSuggestion = pgTable(
  "interest_suggestion",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [unique().on(t.userId, t.body)],
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
export type InterestRow = typeof interest.$inferSelect
