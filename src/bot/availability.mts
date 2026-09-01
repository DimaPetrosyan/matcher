import type { Context } from "grammy"
import {
  finishAvailability,
  findUserByTgId,
  listUserSlots,
  setOnboardingStep,
  setUserSlot,
} from "../database/index.mts"
import { translatorFor } from "../i18n/index.mts"
import { parse, renderAreaStub, renderAvailability, steps } from "./screens.mts"
import { isSlotKey, slotByKey, slotKeysOf } from "./slots.mts"
import { buildInterestsScreen, editScreen } from "./wizard.mts"

const currentSlots = async (userId: string) => slotKeysOf(await listUserSlots(userId))

export const onSlotToggle = async (ctx: Context) => {
  if (!ctx.from || !ctx.callbackQuery?.data) return

  const t = translatorFor(ctx.from.language_code)
  const user = await findUserByTgId(ctx.from.id)

  if (!user) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  const [key = "", target = ""] = parse(ctx.callbackQuery.data).args

  if (!isSlotKey(key)) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  const { recurrence, startTime, endTime } = slotByKey(key)
  const applied = await setUserSlot(user.id, { recurrence, startTime, endTime }, target === "1")

  await ctx.answerCallbackQuery(applied ? undefined : t("alertStaleButton"))
  await editScreen(ctx, renderAvailability(t, { selected: await currentSlots(user.id) }))
}

export const onNextFromAvailability = async (ctx: Context) => {
  if (!ctx.from) return

  const t = translatorFor(ctx.from.language_code)
  const user = await findUserByTgId(ctx.from.id)

  if (!user) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  const selected = await currentSlots(user.id)

  if (selected.length === 0) {
    await ctx.answerCallbackQuery(t("alertPickSlot"))
    await editScreen(ctx, renderAvailability(t, { selected }))
    return
  }

  await finishAvailability(user.id, selected, steps.area)

  await ctx.answerCallbackQuery()
  await editScreen(ctx, renderAreaStub(t))
}

export const onBackToInterests = async (ctx: Context) => {
  if (!ctx.from) return

  const t = translatorFor(ctx.from.language_code)
  const user = await findUserByTgId(ctx.from.id)

  if (!user) {
    await ctx.answerCallbackQuery(t("alertStaleButton"))
    return
  }

  await setOnboardingStep(user.id, steps.interests)

  await ctx.answerCallbackQuery()
  await editScreen(ctx, await buildInterestsScreen(user.id, ctx.from.language_code))
}
