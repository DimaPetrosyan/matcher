import { describe, expect, it } from "bun:test"
import {
  defaultLocale,
  dictionaries,
  format,
  placeholdersOf,
  resolveLocale,
  translatorFor,
  type TextKey,
} from "../src/i18n/translate.mts"

describe("выбор языка", () => {
  it.each([
    ["ru", "ru"],
    ["ru-RU", "ru"],
    ["en", "en"],
    ["en-US", "en"],
    ["EN", "en"],
  ] as const)("%s → %s", (input, expected) => {
    expect(resolveLocale(input)).toBe(expected)
  })

  it.each([undefined, null, "", "de", "zh-Hans"])("неизвестный язык → дефолтный: %s", input => {
    expect(resolveLocale(input)).toBe(defaultLocale)
  })

  it("переводчик отдаёт строку нужного языка", () => {
    expect(translatorFor("en")("buttonConsent")).toBe(dictionaries.en.buttonConsent)
    expect(translatorFor("ru")("buttonConsent")).toBe(dictionaries.ru.buttonConsent)
  })

  it("подставляет параметры", () => {
    expect(translatorFor("ru")("welcomeInCommunity", { community: "Наши" })).toContain("«Наши»")
    expect(translatorFor("en")("deniedInCommunity", { community: "Ours" })).toContain('"Ours"')
  })
})

describe("format", () => {
  it("подставляет известные плейсхолдеры", () => {
    expect(format("привет, {name}", { name: "Аня" })).toBe("привет, Аня")
  })

  it("неизвестный оставляет как есть — молча пропавший текст хуже видимого", () => {
    expect(format("привет, {name}", {})).toBe("привет, {name}")
    expect(format("привет, {name}")).toBe("привет, {name}")
  })
})

describe("словари", () => {
  it("одинаковый набор ключей", () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries.ru).sort())
  })

  it("только непустые строки", () => {
    for (const [name, dict] of Object.entries(dictionaries))
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value).toBe("string")
        expect(`${name}.${key}: "${value}"`).not.toMatch(/: ""$/)
      }
  })

  it("плейсхолдеры совпадают во всех языках", () => {
    for (const key of Object.keys(dictionaries.ru) as TextKey[])
      expect(`${key}: ${placeholdersOf(dictionaries.en[key]).join(",")}`).toBe(
        `${key}: ${placeholdersOf(dictionaries.ru[key]).join(",")}`,
      )
  })

  it("после подстановки не остаётся незакрытых плейсхолдеров", () => {
    for (const dict of Object.values(dictionaries))
      for (const value of Object.values(dict)) {
        const params = Object.fromEntries(placeholdersOf(value).map(k => [k, "X"]))
        expect(format(value, params)).not.toMatch(/\{\w+\}/)
      }
  })
})
