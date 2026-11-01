import { describe, expect, it } from "bun:test"
import {
  buildDays,
  buildSlots,
  isTap,
  parts,
  partOfHour,
  plural,
  slotId,
  totalDays,
  totalSlots,
  weekTitle,
} from "../web/src/calendar"
import { toMeeting } from "../web/src/meetings"
import type { UserEvent } from "../web/src/types"

// Среда, 28 октября 2026, 19:30 по Москве. Неделя начинается в понедельник 26-го.
const now = new Date("2026-10-28T16:30:00Z")

describe("окно календаря", () => {
  it("три недели по семь дней начинаются с понедельника", () => {
    const days = buildDays(now)

    expect(days).toHaveLength(totalDays)
    expect(days).toHaveLength(21)
    expect(days[0]!.iso).toBe("2026-10-26")
    expect(days[0]!.dow).toBe("Пн")
    expect(days[20]!.iso).toBe("2026-11-15")
  })

  it("сегодня отмечен ровно один день", () => {
    const days = buildDays(now)

    expect(days.filter(day => day.isToday).map(day => day.iso)).toEqual(["2026-10-28"])
  })

  it("подписи дня склеены по-русски", () => {
    const days = buildDays(now)

    expect(days[0]!.long).toBe("26 октября")
    expect(days[0]!.short).toBe("Пн, 26 окт")
    expect(days[0]!.dowFull).toBe("Понедельник")
    expect(days[6]!.long).toBe("1 ноября")
  })

  it("заголовок недели берёт её края", () => {
    const days = buildDays(now)

    expect(weekTitle(days, 0)).toBe("26 октября — 1 ноября")
    expect(weekTitle(days, 1)).toBe("2 ноября — 8 ноября")
    expect(weekTitle(days, 2)).toBe("9 ноября — 15 ноября")
  })
})

describe("прошедшие слоты", () => {
  it("закрыты все слоты прошлых дней и сегодняшние до текущего часа", () => {
    const days = buildDays(now)
    const slots = buildSlots(days, now)

    expect(slots).toHaveLength(totalSlots)
    expect(slots).toHaveLength(63)

    const past = slots.filter(slot => slot.past).map(slot => slot.id)

    // Два полных дня плюс утро и день среды: вечер 19–23 ещё открыт в 19:30.
    expect(past).toEqual([
      "2026-10-26:morning",
      "2026-10-26:day",
      "2026-10-26:evening",
      "2026-10-27:morning",
      "2026-10-27:day",
      "2026-10-27:evening",
      "2026-10-28:morning",
      "2026-10-28:day",
    ])
  })

  it("слот опознаётся парой даты и части суток", () => {
    expect(slotId("2026-10-28", "evening")).toBe("2026-10-28:evening")
  })
})

describe("части суток", () => {
  it("границы попадают в правильный период", () => {
    expect(partOfHour(9).key).toBe("morning")
    expect(partOfHour(13).key).toBe("morning")
    expect(partOfHour(14).key).toBe("day")
    expect(partOfHour(18).key).toBe("day")
    expect(partOfHour(19).key).toBe("evening")
    expect(partOfHour(23).key).toBe("evening")
  })

  it("периодов три и они идут по возрастанию часов", () => {
    expect(parts.map(part => part.key)).toEqual(["morning", "day", "evening"])
    expect(parts.map(part => part.to)).toEqual([14, 19, 23])
  })
})

describe("нажатие против протяжки", () => {
  it("небольшой сдвиг пальца остаётся нажатием", () => {
    expect(isTap({ x: 100, y: 200 }, { x: 100, y: 200 })).toBe(true)
    expect(isTap({ x: 100, y: 200 }, { x: 109, y: 208 })).toBe(true)
    expect(isTap({ x: 100, y: 200 }, { x: 90, y: 190 })).toBe(true)
  })

  it("протяжка экрана нажатием не считается", () => {
    // Телеграм тянут вниз: палец уезжает по вертикали на десятки точек.
    expect(isTap({ x: 100, y: 200 }, { x: 100, y: 260 })).toBe(false)
    expect(isTap({ x: 100, y: 200 }, { x: 100, y: 140 })).toBe(false)
    expect(isTap({ x: 100, y: 200 }, { x: 160, y: 200 })).toBe(false)
    expect(isTap({ x: 100, y: 200 }, { x: 111, y: 200 })).toBe(false)
  })
})

describe("склонение", () => {
  it("выбирает форму по числу", () => {
    const forms: [string, string, string] = ["ячейка", "ячейки", "ячеек"]

    expect(plural(1, forms)).toBe("ячейка")
    expect(plural(2, forms)).toBe("ячейки")
    expect(plural(5, forms)).toBe("ячеек")
    expect(plural(11, forms)).toBe("ячеек")
    expect(plural(21, forms)).toBe("ячейка")
  })
})

const event = (patch: Partial<UserEvent> = {}): UserEvent => ({
  id: "e1",
  label: "Бильярд",
  interestKey: "billiards",
  startsAt: "2026-10-29T16:00:00Z",
  endsAt: "2026-10-29T20:00:00Z",
  respondUntil: "2026-10-29T06:30:00Z",
  status: "open",
  myStatus: "invited",
  minSize: 2,
  maxSize: 4,
  going: 1,
  roster: [{ firstName: "Ольга", username: "olga_cue" }],
  ...patch,
})

describe("встреча из события", () => {
  it("раскладывает приглашение по полям макета", () => {
    const meeting = toMeeting(event(), now)

    expect(meeting.slot).toBe("2026-10-29:evening")
    expect(meeting.dateLong).toBe("Четверг, 29 октября")
    expect(meeting.short).toBe("Чт, 29 окт")
    expect(meeting.partLow).toBe("вечер")
    expect(meeting.hours).toBe("19:00–23:00")
    expect(meeting.others).toEqual([{ name: "Ольга", username: "olga_cue" }])
    expect(meeting.deadline).toBe("до 29 окт")
  })

  it("короткий месяц берётся свой, а не из Intl", () => {
    const meeting = toMeeting(event({ startsAt: "2026-11-01T06:00:00Z" }), now)

    // Intl в этом месте отдаёт «нояб.» — для карточки это слишком длинно.
    expect(meeting.short).toBe("Вс, 1 ноя")
    expect(meeting.dateLong).toBe("Воскресенье, 1 ноября")
  })

  it("разводит шесть состояний по паре статусов", () => {
    const of = (patch: Partial<UserEvent>) => toMeeting(event(patch), now).status

    expect(of({})).toBe("pending")
    expect(of({ myStatus: "accepted" })).toBe("going")
    expect(of({ myStatus: "accepted", status: "confirmed" })).toBe("confirmed")
    expect(of({ myStatus: "declined" })).toBe("declined")
    expect(of({ myStatus: "closed", status: "confirmed" })).toBe("full")
    expect(of({ status: "cancelled" })).toBe("failed")
  })

  it("отменённая встреча важнее личного ответа", () => {
    expect(toMeeting(event({ status: "cancelled", myStatus: "accepted" }), now).status).toBe(
      "failed",
    )
  })

  it("срок ответа считается от текущего момента", () => {
    expect(toMeeting(event(), now).until).toBe("ещё 14 часов, до 29 октября")
    expect(toMeeting(event({ respondUntil: "2026-11-01T06:30:00Z" }), now).until).toBe(
      "ещё 3 дня, до 1 ноября",
    )
    expect(toMeeting(event({ respondUntil: "2026-10-27T06:30:00Z" }), now).until).toBe(
      "срок вышел, до 27 октября",
    )
  })
})
