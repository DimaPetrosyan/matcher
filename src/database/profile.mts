import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { recordAudit } from "./audit.mts"
import { db } from "./client.mts"
import { appUser, interest, interestSuggestion, userInterest } from "./schema.mts"
import type { InterestKeyValue } from "./interests.mts"
import type { SlotValue } from "./availability.mts"

export type Profile = {
  interests: string[]
  slots: { recurrence: string; startTime: string; endTime: string }[]
  suggestions: string[]
  onboardingStep: string
  status: string
  district: string | null
  travelRadius: string | null
}

export const loadProfile = async (userId: string): Promise<Profile> => {
  const [rows, slots, suggestions, [user]] = await Promise.all([
    db
      .selectDistinct({ key: interest.key })
      .from(userInterest)
      .innerJoin(interest, eq(interest.id, userInterest.interestId))
      .where(eq(userInterest.userId, userId)),
    db
      .selectDistinct({
        recurrence: userInterest.recurrence,
        startTime: userInterest.startTime,
        endTime: userInterest.endTime,
      })
      .from(userInterest)
      .where(and(eq(userInterest.userId, userId), isNotNull(userInterest.recurrence))),
    db
      .select({ body: interestSuggestion.body })
      .from(interestSuggestion)
      .where(eq(interestSuggestion.userId, userId))
      .orderBy(interestSuggestion.created),
    db
      .select({
        onboardingStep: appUser.onboardingStep,
        status: appUser.status,
        district: appUser.district,
        travelRadius: appUser.travelRadius,
      })
      .from(appUser)
      .where(eq(appUser.id, userId)),
  ])

  return {
    interests: rows.map(row => row.key),
    slots: slots.map(slot => ({
      recurrence: slot.recurrence!,
      startTime: slot.startTime!,
      endTime: slot.endTime!,
    })),
    suggestions: suggestions.map(row => row.body),
    onboardingStep: user?.onboardingStep ?? "interests",
    status: user?.status ?? "onboarding",
    district: user?.district ?? null,
    travelRadius: user?.travelRadius ?? null,
  }
}

const spread = (
  userId: string,
  interestIds: string[],
  slots: SlotValue[],
):
  | (SlotValue & { userId: string; interestId: string })[]
  | { userId: string; interestId: string }[] =>
  slots.length === 0
    ? interestIds.map(interestId => ({ userId, interestId }))
    : interestIds.flatMap(interestId => slots.map(slot => ({ userId, interestId, ...slot })))

export const saveInterests = (
  userId: string,
  keys: InterestKeyValue[],
  suggestions: string[],
  step: string,
) =>
  db.transaction(async trx => {
    const slots = await trx
      .selectDistinct({
        recurrence: userInterest.recurrence,
        startTime: userInterest.startTime,
        endTime: userInterest.endTime,
      })
      .from(userInterest)
      .where(and(eq(userInterest.userId, userId), isNotNull(userInterest.recurrence)))

    const rows =
      keys.length === 0
        ? []
        : await trx
            .select({ id: interest.id })
            .from(interest)
            .where(and(inArray(interest.key, keys), eq(interest.isActive, true)))

    await trx.delete(userInterest).where(eq(userInterest.userId, userId))

    const values = spread(
      userId,
      rows.map(row => row.id),
      slots.map(slot => ({
        recurrence: slot.recurrence!,
        startTime: slot.startTime!,
        endTime: slot.endTime!,
      })),
    )

    if (values.length > 0) await trx.insert(userInterest).values(values).onConflictDoNothing()

    await trx
      .update(appUser)
      .set({ onboardingStep: step, updated: sql`now()` })
      .where(eq(appUser.id, userId))

    await trx.delete(interestSuggestion).where(eq(interestSuggestion.userId, userId))

    if (suggestions.length > 0) {
      await trx
        .insert(interestSuggestion)
        .values(suggestions.map(body => ({ userId, body })))
        .onConflictDoNothing()
    }

    await recordAudit(trx, {
      type: "interests_saved",
      userId,
      payload: { keys, saved: rows.length, suggestions },
    })

    return { saved: rows.length }
  })

export const saveSlots = (userId: string, slots: SlotValue[], step: string) =>
  db.transaction(async trx => {
    const interests = await trx
      .selectDistinct({ interestId: userInterest.interestId })
      .from(userInterest)
      .where(eq(userInterest.userId, userId))

    await trx.delete(userInterest).where(eq(userInterest.userId, userId))

    const values = spread(
      userId,
      interests.map(row => row.interestId),
      slots,
    )

    if (values.length > 0) await trx.insert(userInterest).values(values).onConflictDoNothing()

    await trx
      .update(appUser)
      .set({ onboardingStep: step, updated: sql`now()` })
      .where(eq(appUser.id, userId))

    await recordAudit(trx, {
      type: "availability_saved",
      userId,
      payload: { slots: slots.map(slot => `${slot.recurrence}@${slot.startTime}`) },
    })

    return { saved: values.length }
  })

export const saveArea = (userId: string, district: string, travelRadius: string, step: string) =>
  db.transaction(async trx => {
    await trx
      .update(appUser)
      .set({ district, travelRadius, onboardingStep: step, status: "active", updated: sql`now()` })
      .where(eq(appUser.id, userId))

    await recordAudit(trx, { type: "area_saved", userId, payload: { district, travelRadius } })
  })
