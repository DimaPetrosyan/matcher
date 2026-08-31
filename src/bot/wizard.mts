import { GrammyError, type Context } from "grammy"
import {
  listActiveInterests,
  listUserInterestKeys,
  listUserSuggestions,
  setWizardMessage,
} from "../database/index.mts"
import { resolveLocale, translatorFor } from "../i18n/index.mts"
import { isInterestKey } from "./catalog.mts"
import { renderInterests, type Screen } from "./screens.mts"

export const buildInterestsScreen = async (userId: string, languageCode?: string) => {
  const [catalog, selected, suggestions] = await Promise.all([
    listActiveInterests(),
    listUserInterestKeys(userId),
    listUserSuggestions(userId),
  ])

  return renderInterests(translatorFor(languageCode), resolveLocale(languageCode), {
    catalog: catalog.map(row => row.key).filter(isInterestKey),
    selected,
    suggestions,
  })
}

export const editScreen = async (ctx: Context, screen: Screen) => {
  try {
    await ctx.editMessageText(screen.text, { parse_mode: "HTML", reply_markup: screen.keyboard })
  } catch (error) {
    const notModified =
      error instanceof GrammyError && error.description.includes("message is not modified")
    if (!notModified) throw error
  }
}

export const moveScreen = async (
  ctx: Context,
  userId: string,
  screen: Screen,
  previousMessageId: number | null,
) => {
  if (previousMessageId && ctx.chat) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, previousMessageId)
    } catch (error) {
      if (!(error instanceof GrammyError)) throw error
      console.warn(`could not delete previous wizard message: ${error.description}`)
    }
  }

  const sent = await ctx.reply(screen.text, {
    parse_mode: "HTML",
    reply_markup: screen.keyboard,
  })

  await setWizardMessage(userId, sent.message_id)
}
