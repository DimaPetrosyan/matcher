import { InlineKeyboard, type Bot, type Context } from "grammy"
import { registerCommunityFromChat } from "../database/index.mts"
import { env } from "../env.mts"
import { translatorFor } from "../i18n/index.mts"
import { buildDeepLink } from "./deeplink.mts"

const adminStatuses = new Set(["creator", "administrator"])

export const onConnect = (bot: Bot) => async (ctx: Context) => {
  const chat = ctx.chat
  if (!chat || chat.type === "private" || !ctx.from) return

  const t = translatorFor(ctx.from.language_code)

  const sender = await bot.api.getChatMember(chat.id, ctx.from.id)
  if (!adminStatuses.has(sender.status)) {
    await ctx.reply(t("connectNotAdmin"))
    return
  }

  await registerCommunityFromChat(chat.id, chat.title)

  const link = buildDeepLink(env.botUsername, chat.id)

  await ctx.reply(t("connectDone", { link }), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: new InlineKeyboard().url(t("connectButton"), link),
  })
}
