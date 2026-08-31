import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { interestKey } from "../src/database/schema.mts"
import { interestTextKey, isInterestKey, type InterestKey } from "../src/bot/catalog.mts"
import { callbackLimit, renderInterests } from "../src/bot/screens.mts"
import { locales, translatorFor } from "../src/i18n/translate.mts"

const catalog: InterestKey[] = [...interestKey.enumValues]

const shuffled: InterestKey[] = [...catalog].reverse()

const ru = translatorFor("ru")
const en = translatorFor("en")

const labelsOf = (keyboard: { inline_keyboard: { text: string }[][] }) =>
  keyboard.inline_keyboard.flat().map(button => button.text)

describe("справочник интересов", () => {
  it("перечисление в миграции совпадает со схемой", () => {
    const sql = readFileSync("src/database/migrations/0002.sql", "utf8")
    const block = /create type interest_key as enum \(([^)]*)\)/.exec(sql)

    expect(block).not.toBeNull()

    const values = [...block![1]!.matchAll(/'([^']+)'/g)].map(m => m[1]!)

    expect(values.sort()).toEqual([...catalog].sort())
  })

  it("у каждого значения есть непустая подпись в обоих словарях", () => {
    for (const t of locales.map(translatorFor))
      for (const key of catalog) expect(t(interestTextKey[key]).length).toBeGreaterThan(0)
  })

  it("isInterestKey отсеивает мусор и снятые значения", () => {
    expect(isInterestKey("board")).toBe(true)
    expect(isInterestKey("climb")).toBe(false)
    expect(isInterestKey("")).toBe(false)
    expect(isInterestKey("toString")).toBe(false)
  })
})

describe("экран интересов", () => {
  it("без выбранного ряда «Дальше» нет", () => {
    const { keyboard } = renderInterests(ru, "ru", {
      catalog,
      selected: [],
      suggestions: [],
    })

    expect(labelsOf(keyboard)).not.toContain(ru("buttonNext"))
    expect(keyboard.inline_keyboard).toHaveLength(5)
  })

  it("с одним выбранным ряд «Дальше» появляется ровно один раз", () => {
    const { keyboard } = renderInterests(ru, "ru", {
      catalog,
      selected: ["bar"],
      suggestions: [],
    })

    expect(labelsOf(keyboard).filter(label => label === ru("buttonNext"))).toHaveLength(1)
    expect(keyboard.inline_keyboard.at(-1)).toHaveLength(1)
  })

  it("отмеченный пункт несёт выключение, неотмеченный — включение", () => {
    const { keyboard } = renderInterests(ru, "ru", {
      catalog,
      selected: ["bar"],
      suggestions: [],
    })

    const buttons = keyboard.inline_keyboard.flat()
    const on = buttons.find(b => b.text === `✓ ${ru("interestBar")}`)
    const off = buttons.find(b => b.text === ru("interestBoard"))

    expect(on).toMatchObject({ callback_data: "i|bar|0" })
    expect(off).toMatchObject({ callback_data: "i|board|1" })
  })

  it("кнопки идут по алфавиту подписей, а не в порядке справочника", () => {
    const { keyboard } = renderInterests(ru, "ru", {
      catalog: shuffled,
      selected: [],
      suggestions: [],
    })

    const labels = labelsOf(keyboard)

    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "ru")))
    expect(labels[0]).toBe(ru("interestBanya"))
  })

  it("в разных языках порядок разный", () => {
    const inRussian = labelsOf(
      renderInterests(ru, "ru", { catalog, selected: [], suggestions: [] }).keyboard,
    )
    const inEnglish = labelsOf(
      renderInterests(en, "en", { catalog, selected: [], suggestions: [] }).keyboard,
    )

    expect(inRussian.map(l => l)).not.toEqual(inEnglish.map(l => l))
    expect(inEnglish[0]).toBe(en("interestBanya"))
    expect(inEnglish[1]).toBe(en("interestBar"))
  })

  it("строка «Ваш вариант» появляется только при непустом списке", () => {
    const without = renderInterests(ru, "ru", { catalog, selected: [], suggestions: [] })
    const with_ = renderInterests(ru, "ru", {
      catalog,
      selected: [],
      suggestions: ["Падел", "Сквош"],
    })

    expect(without.text).not.toContain("Ваш вариант")
    expect(with_.text).toContain("Ваш вариант: Падел, Сквош")
  })

  it("свой вариант экранируется, а не ломает разметку", () => {
    const { text } = renderInterests(ru, "ru", {
      catalog,
      selected: [],
      suggestions: ["<b>падел</b> & сквош"],
    })

    expect(text).toContain("&lt;b&gt;падел&lt;/b&gt; &amp; сквош")
    expect(text).not.toContain("<b>падел")
  })

  it("каждая кнопка влезает в лимит callback_data на всех языках", () => {
    for (const t of locales.map(translatorFor)) {
      const { keyboard } = renderInterests(t, "ru", {
        catalog,
        selected: [...catalog],
        suggestions: [],
      })

      for (const button of keyboard.inline_keyboard.flat())
        if ("callback_data" in button)
          expect(Buffer.byteLength(button.callback_data, "utf8")).toBeLessThanOrEqual(callbackLimit)
    }
  })
})
