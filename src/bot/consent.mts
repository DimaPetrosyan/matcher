import type { Bot, Context } from "grammy"
import { registerUser, setWizardMessage, type UserSource } from "../database/index.mts"
import { translatorFor } from "../i18n/index.mts"
import { resolveAccess } from "./access.mts"
import { parseStartPayload } from "./deeplink.mts"
import { parse, renderCommunityLost, renderDenied } from "./screens.mts"
import { buildInterestsScreen, editScreen } from "./wizard.mts"

export const onConsent = (bot: Bot) => async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery?.data) return

  const t = translatorFor(ctx.from.language_code)
  const payload = parse(ctx.callbackQuery.data).args[0]
  const source = parseStartPayload(payload)

  const access = await resolveAccess(bot, ctx.from.id)

  if (access.kind !== "allowed") {
    await ctx.answerCallbackQuery()

    if (access.kind === "lost") {
      await editScreen(ctx, renderCommunityLost(t, access.community))
      return
    }

    if (access.kind === "unverifiable") {
      await ctx.reply(t("unverifiable"))
      return
    }

    await editScreen(ctx, renderDenied(t))
    return
  }

  const userSource: UserSource = source.kind === "chat" ? "deeplink" : "direct"

  const { userId, isNew } = await registerUser({
    tgId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    languageCode: ctx.from.language_code,
    source: userSource,
    fromChatId: source.kind === "chat" ? source.tgChatId : undefined,
    communityIds: access.memberOf.map(c => c.id),
  })

  await ctx.answerCallbackQuery(isNew ? t("alertConsentSaved") : undefined)

  await editScreen(ctx, await buildInterestsScreen(userId, ctx.from.language_code))

  const messageId = ctx.callbackQuery.message?.message_id
  if (messageId) await setWizardMessage(userId, messageId)
}
