import type { Bot, Context } from "grammy"
import { recordStart } from "../database/index.mts"
import { env } from "../env.mts"
import { translatorFor } from "../i18n/index.mts"
import { resolveAccess } from "./access.mts"
import { parseStartPayload } from "./deeplink.mts"
import { renderCommunityLost, renderDenied, renderWelcome } from "./screens.mts"

export const onStart = (bot: Bot) => async (ctx: Context) => {
  if (!ctx.from) return

  const t = translatorFor(ctx.from.language_code)
  const source = parseStartPayload(typeof ctx.match === "string" ? ctx.match : undefined)

  const access = await resolveAccess(bot, ctx.from.id)

  await recordStart({
    tgId: ctx.from.id,
    source: source.kind,
    fromChatId: source.kind === "chat" ? source.tgChatId : null,
    raw: source.kind === "unknown" ? source.raw : null,
    outcome: access.kind,
    communities: access.kind === "allowed" ? access.memberOf.map(c => c.tgChatId) : [],
  })

  if (access.kind === "lost") {
    await ctx.reply(renderCommunityLost(t, access.community).text, { parse_mode: "HTML" })
    return
  }

  if (access.kind === "unverifiable") {
    await ctx.reply(t("unverifiable"))
    return
  }

  if (access.kind === "denied") {
    await ctx.reply(renderDenied(t).text, { parse_mode: "HTML" })
    return
  }

  const fromLink =
    source.kind === "chat" ? access.memberOf.find(c => c.tgChatId === source.tgChatId) : undefined

  const screen = renderWelcome(t, {
    policyUrl: env.policyUrl,
    communityTitle: (fromLink ?? access.memberOf[0]!).title,
    payload: source.kind === "chat" ? `c-${Math.abs(source.tgChatId)}` : undefined,
  })

  await ctx.reply(screen.text, { parse_mode: "HTML", reply_markup: screen.keyboard })
}
