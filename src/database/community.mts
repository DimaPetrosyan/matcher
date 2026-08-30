import { eq, sql } from "drizzle-orm"
import { db } from "./client.mts"
import { community, type CommunityRow } from "./schema.mts"

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
