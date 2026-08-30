import type { Bot, Context } from "grammy"
import { listActiveCommunities, recordStart } from "../database/index.mts"
import { env } from "../env.mts"
import { translatorFor } from "../i18n/index.mts"
import { checkAllCommunities } from "./membership.mts"
import { parseStartPayload } from "./deeplink.mts"
import { renderDenied, renderWelcome } from "../bot/screens.mts"

export const onStart = (bot: Bot) => async (ctx: Context) => {
  if (!ctx.from) return

  const t = translatorFor(ctx.from.language_code)
  const source = parseStartPayload(typeof ctx.match === "string" ? ctx.match : undefined)

  const check = await checkAllCommunities(bot, ctx.from.id, await listActiveCommunities())

  const outcome =
    check.memberOf.length > 0 ? "allowed" : check.unverifiable ? "unverifiable" : "denied"

  await recordStart({
    tgId: ctx.from.id,
    source: source.kind,
    fromChatId: source.kind === "chat" ? source.tgChatId : null,
    raw: source.kind === "unknown" ? source.raw : null,
    outcome,
    communities: check.memberOf.map(c => c.tgChatId),
  })

  if (outcome === "unverifiable") {
    await ctx.reply(t("unverifiable"))
    return
  }

  if (outcome === "denied") {
    await ctx.reply(renderDenied(t).text, { parse_mode: "HTML" })
    return
  }

  const fromLink =
    source.kind === "chat" ? check.memberOf.find(c => c.tgChatId === source.tgChatId) : undefined

  const screen = renderWelcome(t, {
    policyUrl: env.policyUrl,
    communityTitle: (fromLink ?? check.memberOf[0]!).title,
    payload: source.kind === "chat" ? `c-${Math.abs(source.tgChatId)}` : undefined,
  })

  await ctx.reply(screen.text, { parse_mode: "HTML", reply_markup: screen.keyboard })
}
