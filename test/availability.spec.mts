import { describe, expect, it } from "bun:test"
import { isSlotKey, slotKeyOf, slotKeysOf, slots } from "../src/bot/slots.mts"
import { callbackLimit, renderAvailability } from "../src/bot/screens.mts"
import { locales, translatorFor } from "../src/i18n/translate.mts"

const ru = translatorFor("ru")

const days: Record<string, string> = {
  mon: "MO",
  tue: "TU",
  wed: "WE",
  thu: "TH",
  fri: "FR",
  sat: "SA",
  sun: "SU",
}

const buttonsOf = (screen: ReturnType<typeof renderAvailability>) =>
  screen.keyboard.inline_keyboard.flat()

const labelsOf = (screen: ReturnType<typeof renderAvailability>) =>
  buttonsOf(screen).map(button => button.text)

describe("справочник слотов", () => {
  it("правило повторения соответствует дню в ключе", () => {
    for (const slot of slots)
      expect(slot.recurrence as string).toBe(
        `RRULE:FREQ=WEEKLY;BYDAY=${days[slot.key.slice(0, 3)]}`,
      )
  })

  it("окно не вывернуто наизнанку", () => {
    for (const slot of slots) expect(slot.startTime < slot.endTime).toBe(true)
  })

  it("пара «правило + начало» уникальна", () => {
    const pairs = slots.map(slot => `${slot.recurrence}@${slot.startTime}`)
    expect(new Set(pairs).size).toBe(slots.length)
  })

  it("часы записаны так же, как их отдаёт Postgres", () => {
    for (const slot of slots) {
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
      expect(slot.endTime).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    }
  })

  it("isSlotKey отсеивает мусор", () => {
    expect(isSlotKey("satEve")).toBe(true)
    expect(isSlotKey("satNight")).toBe(false)
    expect(isSlotKey("toString")).toBe(false)
  })
})

describe("обратное отображение строк базы в слоты", () => {
  it("строка узнаётся по правилу и началу окна", () => {
    expect(slotKeyOf({ recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA", startTime: "16:00:00" })).toBe(
      "satEve",
    )
  })

  it("тот же день с другим окном — другой слот", () => {
    expect(slotKeyOf({ recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA", startTime: "12:00:00" })).toBe(
      "satDay",
    )
  })

  it("чужие часы не опознаются", () => {
    expect(
      slotKeyOf({ recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA", startTime: "09:00:00" }),
    ).toBeNull()
    expect(slotKeyOf({ recurrence: null, startTime: null })).toBeNull()
  })

  it("порядок восстанавливается сеточный, а не тот, в котором пришли строки", () => {
    const rows = [
      { recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU", startTime: "16:00:00" },
      { recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TU", startTime: "19:00:00" },
      { recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA", startTime: "12:00:00" },
    ]

    expect(slotKeysOf(rows)).toEqual(["tueEve", "satDay", "sunEve"])
  })

  it("дубли строк схлопываются", () => {
    const row = { recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TU", startTime: "19:00:00" }
    expect(slotKeysOf([row, row, row])).toEqual(["tueEve"])
  })
})

describe("экран времени", () => {
  it("сетка раскладывается 3 + 2 будни и 2 + 2 выходные", () => {
    const screen = renderAvailability(ru, { selected: [] })
    expect(screen.keyboard.inline_keyboard.map(row => row.length)).toEqual([3, 2, 2, 2, 1])
  })

  it("без выбранного «Дальше» нет, а «Назад» есть", () => {
    const labels = labelsOf(renderAvailability(ru, { selected: [] }))

    expect(labels).not.toContain(ru("buttonNext"))
    expect(labels).toContain(ru("buttonBack"))
  })

  it("с одним выбранным появляется «Дальше», ровно один", () => {
    const screen = renderAvailability(ru, { selected: ["tueEve"] })

    expect(labelsOf(screen).filter(label => label === ru("buttonNext"))).toHaveLength(1)
    expect(screen.keyboard.inline_keyboard.at(-1)).toHaveLength(2)
  })

  it("отмеченный слот несёт выключение, неотмеченный — включение", () => {
    const buttons = buttonsOf(renderAvailability(ru, { selected: ["satEve"] }))

    expect(buttons.find(b => b.text === `✓ ${ru("slotSatEve")}`)).toMatchObject({
      callback_data: "s|satEve|0",
    })
    expect(buttons.find(b => b.text === ru("slotSatDay"))).toMatchObject({
      callback_data: "s|satDay|1",
    })
  })

  it("каждая кнопка влезает в лимит callback_data на всех языках", () => {
    for (const t of locales.map(translatorFor)) {
      const screen = renderAvailability(t, { selected: slots.map(slot => slot.key) })

      for (const button of buttonsOf(screen))
        if ("callback_data" in button)
          expect(Buffer.byteLength(button.callback_data, "utf8")).toBeLessThanOrEqual(callbackLimit)
    }
  })
})
