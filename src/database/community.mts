import { and, eq, sql } from "drizzle-orm"
import { db } from "./client.mts"
import { appUser, community, userCommunity, type CommunityRow } from "./schema.mts"

export const listActiveCommunities = () =>
  db.select().from(community).where(eq(community.isActive, true))

export const findCommunityByChatId = async (tgChatId: number): Promise<CommunityRow | null> => {
  const [row] = await db.select().from(community).where(eq(community.tgChatId, tgChatId))
  return row ?? null
}

export const registerCommunityFromChat = async (tgChatId: number, title: string) => {
  const [row] = await db
    .insert(community)
    .values({ title, tgChatId, isActive: true })
    .onConflictDoUpdate({
      target: community.tgChatId,
      set: { title, isActive: true, updated: sql`now()` },
    })
    .returning({ tgChatId: community.tgChatId, title: community.title })

  return row!
}

export const deactivateCommunity = async (tgChatId: number) => {
  const [row] = await db
    .update(community)
    .set({ isActive: false, updated: sql`now()` })
    .where(and(eq(community.tgChatId, tgChatId), eq(community.isActive, true)))
    .returning({ title: community.title })

  return row ?? null
}

export const listUserCommunities = (tgId: number) =>
  db
    .select({
      title: community.title,
      tgChatId: community.tgChatId,
      isActive: community.isActive,
    })
    .from(userCommunity)
    .innerJoin(appUser, eq(appUser.id, userCommunity.userId))
    .innerJoin(community, eq(community.id, userCommunity.communityId))
    .where(eq(appUser.tgId, tgId))
