import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy"
import {
  deactivateCommunity,
  registerCommunityFromChat,
  removeUserFromCommunity,
} from "../database/index.mts"
import { env } from "../env.mts"
import { translatorFor } from "../i18n/index.mts"
import { actions, steps } from "./screens.mts"
import { buildDeepLink } from "./deeplink.mts"
import { isChatMember } from "./membership.mts"
import { onConnect } from "./connect.mts"
import { onBackToInterests, onNextFromAvailability, onSlotToggle } from "./availability.mts"
import { onConsent } from "./consent.mts"
import { onInterestText, onInterestToggle, onNextFromInterests } from "./interests.mts"
import { onStart } from "./start.mts"

export const bot = new Bot(env.botToken)

bot.on("my_chat_member", async ctx => {
  const { chat, new_chat_member: member } = ctx.myChatMember
  if (chat.type === "private") return

  const t = translatorFor(ctx.from.language_code)
  console.log(`bot is now "${member.status}" in ${chat.type} "${chat.title}", chat id: ${chat.id}`)

  if (member.status === "left" || member.status === "kicked") {
    const row = await deactivateCommunity(chat.id)
    console.warn(
      `bot removed from chat ${chat.id}` + (row ? `, community "${row.title}" deactivated` : ""),
    )
    return
  }

  await registerCommunityFromChat(chat.id, chat.title)

  if (member.status !== "administrator") {
    console.warn(`chat ${chat.id} needs admin rights before membership checks work`)
    await ctx.reply(t("groupIntro"), { parse_mode: "HTML" })
    return
  }

  await ctx.reply(t("groupReady"), {
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().url(
      t("groupStartButton"),
      buildDeepLink(env.botUsername, chat.id),
    ),
  })
})

bot.on("chat_member", async ctx => {
  const { chat, old_chat_member: before, new_chat_member: after } = ctx.chatMember
  if (after.user.is_bot) return

  const wasIn = isChatMember(before)
  const isIn = isChatMember(after)

  if (wasIn === isIn) return

  if (!isIn) {
    const result = await removeUserFromCommunity(after.user.id, chat.id)
    console.log(
      `user ${after.user.id} left chat ${chat.id}` +
        (result ? `, communities left: ${result.remaining}` : ", not registered"),
    )
    return
  }

  console.log(`user ${after.user.id} joined chat ${chat.id}`)
})

bot.command("connect", onConnect(bot))

bot.use(async (ctx, next) => {
  if (ctx.chat?.type !== "private") return
  await next()
})

bot.command("start", onStart(bot))
bot.callbackQuery(new RegExp(`^${actions.consent}(\\||$)`), onConsent(bot))
bot.callbackQuery(new RegExp(`^${actions.interest}\\|`), onInterestToggle)
bot.callbackQuery(new RegExp(`^${actions.slot}\\|`), onSlotToggle)
bot.callbackQuery(`${actions.next}|${steps.interests}`, onNextFromInterests)
bot.callbackQuery(`${actions.next}|${steps.availability}`, onNextFromAvailability)
bot.callbackQuery(`${actions.back}|${steps.interests}`, onBackToInterests)
bot.on("message:text", onInterestText)

bot.on("callback_query:data", async ctx => {
  console.warn("unknown callback_data:", ctx.callbackQuery.data)
  await ctx.answerCallbackQuery(translatorFor(ctx.from.language_code)("alertStaleButton"))
})

bot.catch(async err => {
  const e = err.error

  if (e instanceof GrammyError) console.error("telegram api error:", e.description)
  else if (e instanceof HttpError) console.error("network error:", e)
  else console.error("unhandled error:", e)

  try {
    await err.ctx.reply(translatorFor(err.ctx.from?.language_code)("genericError"))
  } catch {}
})

export const startBot = async () => {
  await bot.init()

  void bot.start({
    allowed_updates: ["message", "callback_query", "my_chat_member", "chat_member"],
    onStart: info => console.log(`long polling started for @${info.username}`),
  })
}
