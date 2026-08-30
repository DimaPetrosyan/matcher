import { en } from "./en.mts"
import { ru } from "./ru.mts"

export type TextKey = keyof typeof ru
export type Dictionary = Record<TextKey, string>
export type Translate = (key: TextKey, params?: Record<string, string>) => string

export const locales = ["ru", "en"] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "ru"

export const dictionaries: Record<Locale, Dictionary> = { ru, en }

const placeholder = /\{(\w+)\}/g

export const format = (template: string, params?: Record<string, string>) =>
  params
    ? template.replace(placeholder, (whole, key: string) => (key in params ? params[key]! : whole))
    : template

export const placeholdersOf = (template: string) =>
  [...template.matchAll(placeholder)].map(m => m[1]!).sort()

export const resolveLocale = (languageCode?: string | null): Locale => {
  const primary = languageCode?.split("-")[0]?.toLowerCase()
  return locales.includes(primary as Locale) ? (primary as Locale) : defaultLocale
}

export const translatorFor = (languageCode?: string | null): Translate => {
  const dictionary = dictionaries[resolveLocale(languageCode)]
  return (key, params) => format(dictionary[key], params)
}
