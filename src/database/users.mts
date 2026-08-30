import { and, eq, sql } from "drizzle-orm"
import { recordAudit } from "./audit.mts"
import { db } from "./client.mts"
import { env } from "../env.mts"
import { appUser, community, userCommunity } from "./schema.mts"

export type UserSource = "direct" | "deeplink" | "deeplinkUnknown"

const sourceColumn: Record<UserSource, string> = {
  direct: "direct",
  deeplink: "deeplink",
  deeplinkUnknown: "deeplink_unknown",
}

export type RegisterCommand = {
  tgId: number
  username?: string
  firstName?: string
  languageCode?: string
  source: UserSource
  fromChatId?: number
  communityIds: string[]
}

export const recordStart = (payload: Record<string, unknown>) =>
  recordAudit(db, { type: "start_command", payload })

export const registerUser = (cmd: RegisterCommand) =>
  db.transaction(async trx => {
    const inserted = await trx
      .insert(appUser)
      .values({
        tgId: cmd.tgId,
        username: cmd.username ?? null,
        firstName: cmd.firstName ?? null,
        languageCode: cmd.languageCode ?? null,
        source: sourceColumn[cmd.source],
        consentAt: new Date(),
        consentVersion: env.consentVersion,
      })
      .onConflictDoNothing({ target: appUser.tgId })
      .returning({ id: appUser.id })

    const isNew = inserted.length > 0

    const userId = isNew
      ? inserted[0]!.id
      : (await trx.select({ id: appUser.id }).from(appUser).where(eq(appUser.tgId, cmd.tgId)))[0]!
          .id

    if (cmd.communityIds.length > 0) {
      await trx
        .insert(userCommunity)
        .values(cmd.communityIds.map(communityId => ({ userId, communityId })))
        .onConflictDoNothing()
    }

    if (isNew) {
      await recordAudit(trx, {
        type: "consent_given",
        userId,
        payload: {
          version: env.consentVersion,
          source: cmd.source,
          fromChatId: cmd.fromChatId ?? null,
        },
      })
    }

    return { userId, isNew }
  })

export const removeUserFromCommunity = (tgId: number, tgChatId: number) =>
  db.transaction(async trx => {
    const [user] = await trx.select({ id: appUser.id }).from(appUser).where(eq(appUser.tgId, tgId))

    const [chat] = await trx
      .select({ id: community.id })
      .from(community)
      .where(eq(community.tgChatId, tgChatId))

    if (!user || !chat) return null

    await trx
      .delete(userCommunity)
      .where(and(eq(userCommunity.userId, user.id), eq(userCommunity.communityId, chat.id)))

    const remaining = await trx
      .select({ communityId: userCommunity.communityId })
      .from(userCommunity)
      .where(eq(userCommunity.userId, user.id))

    if (remaining.length === 0) {
      await trx
        .update(appUser)
        .set({ status: "left", updated: sql`now()` })
        .where(eq(appUser.id, user.id))
    }

    return { remaining: remaining.length }
  })
