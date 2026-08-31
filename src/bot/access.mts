import type { Bot } from "grammy"
import {
  deactivateCommunity,
  listActiveCommunities,
  listUserCommunities,
  type CommunityRow,
} from "../database/index.mts"
import { checkAllCommunities } from "./membership.mts"

export type Access =
  | { kind: "allowed"; memberOf: CommunityRow[] }
  | { kind: "lost"; community: string }
  | { kind: "unverifiable" }
  | { kind: "denied" }

export const resolveAccess = async (bot: Bot, tgId: number): Promise<Access> => {
  const check = await checkAllCommunities(bot, tgId, await listActiveCommunities())

  for (const chat of check.lostAccess) {
    const row = await deactivateCommunity(chat.tgChatId)
    if (row) console.warn(`community ${chat.tgChatId} ("${row.title}") deactivated: no access`)
  }

  if (check.memberOf.length > 0) return { kind: "allowed", memberOf: check.memberOf }

  const own = await listUserCommunities(tgId)
  const lost = own.find(c => !c.isActive)

  if (lost && own.every(c => !c.isActive)) return { kind: "lost", community: lost.title }

  if (check.unverifiable) return { kind: "unverifiable" }

  return { kind: "denied" }
}
