import { GrammyError, type Bot } from "grammy"
import { findUserByTgId, setWizardMessage } from "../database/index.mts"
import { env } from "../env.mts"
import { translatorFor } from "../i18n/index.mts"
import { renderProfileReady } from "./screens.mts"

const describe = (error: unknown) => (error instanceof GrammyError ? error.description : "")

const isNotModified = (error: unknown) => describe(error).includes("message is not modified")

const isGone = (error: unknown) =>
  /message to edit not found|message can't be edited|MESSAGE_ID_INVALID/i.test(describe(error))

export const announceProfileReady = async (bot: Bot, tgId: number, languageCode?: string) => {
  const user = await findUserByTgId(tgId)
  if (!user) return

  const screen = renderProfileReady(translatorFor(languageCode), env.webAppUrl)
  const options = { parse_mode: "HTML" as const, reply_markup: screen.keyboard }

  if (user.wizardMessageId) {
    try {
      await bot.api.editMessageText(tgId, user.wizardMessageId, screen.text, options)
      return
    } catch (error) {
      if (isNotModified(error)) return
      if (!isGone(error)) throw error
      console.warn(`wizard message ${user.wizardMessageId} for ${tgId} is gone, sending a new one`)
    }
  }

  const sent = await bot.api.sendMessage(tgId, screen.text, options)
  await setWizardMessage(user.id, sent.message_id)
}
