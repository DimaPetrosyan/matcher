import { InlineKeyboard } from "grammy"
import type { Translate } from "../i18n/index.mts"

export const callbackLimit = 64

export const actions = { consent: "go" } as const

export const pack = (action: string, ...args: string[]) => {
  const data = [action, ...args].join("|")

  if (Buffer.byteLength(data, "utf8") > callbackLimit) {
    throw new Error(`callback_data exceeds ${callbackLimit} bytes: ${data}`)
  }

  return data
}

export const parse = (data: string) => {
  const [action = "", ...args] = data.split("|")
  return { action, args }
}

export type Screen = { text: string; keyboard: InlineKeyboard }

export const renderDenied = (t: Translate, communityTitle?: string): Screen => ({
  text: communityTitle ? t("deniedInCommunity", { community: communityTitle }) : t("denied"),
  keyboard: new InlineKeyboard(),
})

export const renderWelcome = (
  t: Translate,
  opts: { policyUrl: string; communityTitle?: string; payload?: string },
): Screen => ({
  text: opts.communityTitle
    ? t("welcomeInCommunity", { community: opts.communityTitle })
    : t("welcome"),
  keyboard: new InlineKeyboard()
    .text(
      t("buttonConsent"),
      opts.payload ? pack(actions.consent, opts.payload) : pack(actions.consent),
    )
    .row()
    .url(t("buttonPolicy"), opts.policyUrl),
})

export const renderOnboardingStub = (t: Translate): Screen => ({
  text: t("onboardingStub"),
  keyboard: new InlineKeyboard(),
})
