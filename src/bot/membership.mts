import { GrammyError, type Bot } from "grammy"
import type { CommunityRow } from "../database/schema.mts"

export type MembershipResult = "member" | "notMember" | "noAccess" | "unverifiable"

export type MembershipCheck = {
  memberOf: CommunityRow[]
  lostAccess: CommunityRow[]
  unverifiable: boolean
}

const memberStatuses = new Set(["creator", "administrator", "member"])

const noAccessPattern = /chat not found|not a member|was kicked|bot was blocked/i

export const isChatMember = (member: { status: string; is_member?: boolean }) =>
  memberStatuses.has(member.status) || (member.status === "restricted" && member.is_member === true)

export const isAccessLost = (error: unknown) =>
  error instanceof GrammyError &&
  !error.parameters?.migrate_to_chat_id &&
  (error.error_code === 403 || noAccessPattern.test(error.description))

export const checkMembership = async (
  bot: Bot,
  tgId: number,
  chat: CommunityRow,
): Promise<MembershipResult> => {
  try {
    const member = await bot.api.getChatMember(chat.tgChatId, tgId)

    return isChatMember(member) ? "member" : "notMember"
  } catch (error) {
    if (isAccessLost(error)) {
      console.warn(`no access to chat ${chat.tgChatId} ("${chat.title}"):`, error)
      return "noAccess"
    }

    console.error(`membership check failed for chat ${chat.tgChatId} ("${chat.title}"):`, error)
    return "unverifiable"
  }
}

export const checkAllCommunities = async (
  bot: Bot,
  tgId: number,
  communities: CommunityRow[],
): Promise<MembershipCheck> => {
  const results = await Promise.all(
    communities.map(async c => ({ community: c, result: await checkMembership(bot, tgId, c) })),
  )

  return {
    memberOf: results.filter(r => r.result === "member").map(r => r.community),
    lostAccess: results.filter(r => r.result === "noAccess").map(r => r.community),
    unverifiable: results.some(r => r.result === "unverifiable"),
  }
}
