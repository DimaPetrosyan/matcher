import { and, eq, sql } from "drizzle-orm"
import { recordAudit } from "./audit.mts"
import { db } from "./client.mts"
import { appUser, interest, interestKey, interestSuggestion, userInterest } from "./schema.mts"

export type InterestKeyValue = (typeof interestKey.enumValues)[number]

export const listActiveInterests = () =>
  db
    .select({ id: interest.id, key: interest.key })
    .from(interest)
    .where(eq(interest.isActive, true))

export const findUserByTgId = async (tgId: number) => {
  const [row] = await db
    .select({
      id: appUser.id,
      onboardingStep: appUser.onboardingStep,
      wizardMessageId: appUser.wizardMessageId,
    })
    .from(appUser)
    .where(eq(appUser.tgId, tgId))

  return row ?? null
}

export const listUserInterestKeys = async (userId: string) => {
  const rows = await db
    .select({ key: interest.key })
    .from(userInterest)
    .innerJoin(interest, eq(interest.id, userInterest.interestId))
    .where(eq(userInterest.userId, userId))

  return rows.map(row => row.key)
}

export const setUserInterest = async (userId: string, key: InterestKeyValue, on: boolean) => {
  const [row] = await db
    .select({ id: interest.id })
    .from(interest)
    .where(and(eq(interest.key, key), eq(interest.isActive, true)))

  if (!row) return false

  if (on) {
    await db.insert(userInterest).values({ userId, interestId: row.id }).onConflictDoNothing()
  } else {
    await db
      .delete(userInterest)
      .where(and(eq(userInterest.userId, userId), eq(userInterest.interestId, row.id)))
  }

  return true
}

export const listUserSuggestions = async (userId: string) => {
  const rows = await db
    .select({ body: interestSuggestion.body })
    .from(interestSuggestion)
    .where(eq(interestSuggestion.userId, userId))
    .orderBy(interestSuggestion.created)

  return rows.map(row => row.body)
}

export const addUserSuggestion = (userId: string, body: string, limit: number) =>
  db.transaction(async trx => {
    const rows = await trx
      .select({ body: interestSuggestion.body })
      .from(interestSuggestion)
      .where(eq(interestSuggestion.userId, userId))
      .orderBy(interestSuggestion.created)

    const bodies = rows.map(row => row.body)

    if (bodies.includes(body)) return { added: false, atLimit: false, bodies }
    if (bodies.length >= limit) return { added: false, atLimit: true, bodies }

    await trx.insert(interestSuggestion).values({ userId, body }).onConflictDoNothing()

    await recordAudit(trx, { type: "interest_suggested", userId, payload: { body } })

    return { added: true, atLimit: false, bodies: [...bodies, body] }
  })

export const finishInterests = (userId: string, keys: string[], step: string) =>
  db.transaction(async trx => {
    await trx
      .update(appUser)
      .set({ onboardingStep: step, updated: sql`now()` })
      .where(eq(appUser.id, userId))

    await recordAudit(trx, { type: "interests_saved", userId, payload: { keys } })
  })

export const setWizardMessage = (userId: string, messageId: number) =>
  db
    .update(appUser)
    .set({ wizardMessageId: messageId, updated: sql`now()` })
    .where(eq(appUser.id, userId))
