import { InlineKeyboard } from "grammy"
import type { InlineKeyboardButton } from "grammy/types"
import type { Locale, Translate } from "../i18n/index.mts"
import { byLabel, interestTextKey, type InterestKey } from "./catalog.mts"

export const callbackLimit = 64

export const actions = { consent: "go", interest: "i", next: "n" } as const

export const steps = { interests: "interests", availability: "availability" } as const

export const suggestionLimit = 5

export const suggestionMaxLength = 64

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

export const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

export type Screen = { text: string; keyboard: InlineKeyboard }

export const renderDenied = (t: Translate, communityTitle?: string): Screen => ({
  text: communityTitle ? t("deniedInCommunity", { community: communityTitle }) : t("denied"),
  keyboard: new InlineKeyboard(),
})

export const renderCommunityLost = (t: Translate, community: string): Screen => ({
  text: t("communityLost", { community }),
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

export const renderInterests = (
  t: Translate,
  locale: Locale,
  opts: { catalog: InterestKey[]; selected: string[]; suggestions: string[] },
): Screen => {
  const selected = new Set(opts.selected)

  const chips: InlineKeyboardButton[] = [...opts.catalog].sort(byLabel(t, locale)).map(key => ({
    text: selected.has(key) ? `✓ ${t(interestTextKey[key])}` : t(interestTextKey[key]),
    callback_data: pack(actions.interest, key, selected.has(key) ? "0" : "1"),
  }))

  const rows: InlineKeyboardButton[][] = []
  for (let i = 0; i < chips.length; i += 2) rows.push(chips.slice(i, i + 2))

  if (selected.size > 0) {
    rows.push([{ text: t("buttonNext"), callback_data: pack(actions.next, steps.interests) }])
  }

  const blocks = [t("interestsTitle")]

  if (opts.suggestions.length > 0) {
    blocks.push(t("interestsOwn", { items: opts.suggestions.map(escapeHtml).join(", ") }))
  }

  return { text: blocks.join("\n\n"), keyboard: new InlineKeyboard(rows) }
}

export const renderAvailabilityStub = (t: Translate): Screen => ({
  text: t("availabilityStub"),
  keyboard: new InlineKeyboard(),
})
