import type { interestKey } from "../database/index.mts"
import type { Locale, TextKey, Translate } from "../i18n/index.mts"

export type InterestKey = (typeof interestKey.enumValues)[number]

export const interestTextKey: Record<InterestKey, TextKey> = {
  board: "interestBoard",
  bar: "interestBar",
  run: "interestRun",
  movie: "interestMovie",
  expo: "interestExpo",
  coffee: "interestCoffee",
  bike: "interestBike",
  banya: "interestBanya",
  volley: "interestVolley",
  karaoke: "interestKaraoke",
}

export const isInterestKey = (value: string): value is InterestKey =>
  Object.hasOwn(interestTextKey, value)

export const byLabel =
  (t: Translate, locale: Locale) =>
  (a: InterestKey, b: InterestKey): number =>
    t(interestTextKey[a]).localeCompare(t(interestTextKey[b]), locale)
