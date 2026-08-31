import type { Context } from "grammy"
import {
  addUserSuggestion,
  findUserByTgId,
  finishInterests,
  listUserInterestKeys,
  setUserInterest,
} from "../database/index.mts"
import { translatorFor } from "../i18n/index.mts"
import { isInterestKey } from "./catalog.mts"
import {
  parse,
  renderAvailabilityStub,
  steps,
  suggestionLimit,
  suggestionMaxLength,
} from "./screens.mts"
import { buildInterestsScreen, editScreen, moveScreen } from "./wizard.mts"

export const onInterestToggle = async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery?.data) return

  const t = translatorFor(ctx.from.language_code)
  const user = await findUserByTgId(ctx.from.id)

  if (!user) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  const [key = "", target = ""] = parse(ctx.callbackQuery.data).args

  const applied = isInterestKey(key) && (await setUserInterest(user.id, key, target === "1"))

  await ctx.answerCallbackQuery(applied ? undefined : t("alertStaleButton"))
  await editScreen(ctx, await buildInterestsScreen(user.id, ctx.from.language_code))
}

export const onNextFromInterests = async (ctx: Context) => {
  if (!ctx.from) return

  const t = translatorFor(ctx.from.language_code)
  const user = await findUserByTgId(ctx.from.id)

  if (!user) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  const keys = await listUserInterestKeys(user.id)

  if (keys.length === 0) {
    await ctx.answerCallbackQuery(t("alertPickOne"))
    await editScreen(ctx, await buildInterestsScreen(user.id, ctx.from.language_code))
    return
  }

  await finishInterests(user.id, keys, steps.availability)

  await ctx.answerCallbackQuery()
  await editScreen(ctx, renderAvailabilityStub(t))
}

export const onInterestText = async (ctx: Context) => {
  if (!ctx.from || !ctx.message?.text) return

  const user = await findUserByTgId(ctx.from.id)
  if (!user || user.onboardingStep !== steps.interests) return

  const t = translatorFor(ctx.from.language_code)
  const body = ctx.message.text.trim()

  if (body.length === 0) return

  if (body.length > suggestionMaxLength) {
    await ctx.reply(t("interestsTooLong", { limit: String(suggestionMaxLength) }))
    return
  }

  const { atLimit } = await addUserSuggestion(user.id, body, suggestionLimit)

  if (atLimit) {
    await ctx.reply(t("interestsLimit"))
    return
  }

  await moveScreen(
    ctx,
    user.id,
    await buildInterestsScreen(user.id, ctx.from.language_code),
    user.wizardMessageId,
  )
}
