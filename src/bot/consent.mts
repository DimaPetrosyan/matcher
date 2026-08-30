import { GrammyError, type Bot, type Context } from "grammy"
import { listActiveCommunities, registerUser, type UserSource } from "../database/index.mts"
import { translatorFor } from "../i18n/index.mts"
import { checkAllCommunities } from "./membership.mts"
import { parseStartPayload } from "./deeplink.mts"
import { parse, renderDenied, renderOnboardingStub } from "./screens.mts"

const edit = async (ctx: Context, text: string) => {
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML" })
  } catch (error) {
    const notModified =
      error instanceof GrammyError && error.description.includes("message is not modified")
    if (!notModified) throw error
  }
}

export const onConsent = (bot: Bot) => async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery?.data) return

  const t = translatorFor(ctx.from.language_code)
  const payload = parse(ctx.callbackQuery.data).args[0]
  const source = parseStartPayload(payload)

  const check = await checkAllCommunities(bot, ctx.from.id, await listActiveCommunities())

  if (check.memberOf.length === 0) {
    await ctx.answerCallbackQuery()

    if (check.unverifiable) {
      await ctx.reply(t("unverifiable"))
      return
    }

    await edit(ctx, renderDenied(t).text)
    return
  }

  const userSource: UserSource = source.kind === "chat" ? "deeplink" : "direct"

  const { isNew } = await registerUser({
    tgId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    languageCode: ctx.from.language_code,
    source: userSource,
    fromChatId: source.kind === "chat" ? source.tgChatId : undefined,
    communityIds: check.memberOf.map(c => c.id),
  })

  await ctx.answerCallbackQuery(isNew ? t("alertConsentSaved") : t("alertAlreadyRegistered"))
  await edit(ctx, renderOnboardingStub(t).text)
}
