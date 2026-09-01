import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { recordAudit } from "./audit.mts"
import { db } from "./client.mts"
import { appUser, userInterest } from "./schema.mts"

export type SlotValue = { recurrence: string; startTime: string; endTime: string }

export const slotTarget = [
  userInterest.userId,
  userInterest.interestId,
  userInterest.recurrence,
  userInterest.startTime,
]

export const listUserSlots = (userId: string) =>
  db
    .selectDistinct({
      recurrence: userInterest.recurrence,
      startTime: userInterest.startTime,
      endTime: userInterest.endTime,
    })
    .from(userInterest)
    .where(and(eq(userInterest.userId, userId), isNotNull(userInterest.recurrence)))

export const setUserSlot = (userId: string, slot: SlotValue, on: boolean) =>
  db.transaction(async trx => {
    const interests = await trx
      .selectDistinct({ interestId: userInterest.interestId })
      .from(userInterest)
      .where(eq(userInterest.userId, userId))

    if (interests.length === 0) return false

    if (on) {
      await trx
        .delete(userInterest)
        .where(and(eq(userInterest.userId, userId), isNull(userInterest.recurrence)))

      await trx
        .insert(userInterest)
        .values(interests.map(row => ({ userId, interestId: row.interestId, ...slot })))
        .onConflictDoNothing({ target: slotTarget })

      return true
    }

    await trx
      .delete(userInterest)
      .where(
        and(
          eq(userInterest.userId, userId),
          eq(userInterest.recurrence, slot.recurrence),
          eq(userInterest.startTime, slot.startTime),
        ),
      )

    const remaining = await trx
      .selectDistinct({ recurrence: userInterest.recurrence })
      .from(userInterest)
      .where(and(eq(userInterest.userId, userId), isNotNull(userInterest.recurrence)))

    if (remaining.length === 0) {
      await trx
        .insert(userInterest)
        .values(interests.map(row => ({ userId, interestId: row.interestId })))
        .onConflictDoNothing({ target: slotTarget })
    }

    return true
  })

export const finishAvailability = (userId: string, slotKeys: string[], step: string) =>
  db.transaction(async trx => {
    await trx
      .update(appUser)
      .set({ onboardingStep: step, updated: sql`now()` })
      .where(eq(appUser.id, userId))

    await recordAudit(trx, { type: "availability_saved", userId, payload: { slots: slotKeys } })
  })

export const setOnboardingStep = (userId: string, step: string) =>
  db
    .update(appUser)
    .set({ onboardingStep: step, updated: sql`now()` })
    .where(eq(appUser.id, userId))
