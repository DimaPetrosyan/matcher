import type { Bot } from "grammy"
import { resolveAccess, type Access } from "../bot/access.mts"

const ttlMs = 5 * 60 * 1000

const cache = new Map<number, { access: Access; until: number }>()

export const cachedAccess = async (bot: Bot, tgId: number, now = Date.now()): Promise<Access> => {
  const hit = cache.get(tgId)
  if (hit && hit.until > now) return hit.access

  const access = await resolveAccess(bot, tgId)

  if (access.kind !== "unverifiable") cache.set(tgId, { access, until: now + ttlMs })

  return access
}

export const forgetAccess = (tgId: number) => cache.delete(tgId)
