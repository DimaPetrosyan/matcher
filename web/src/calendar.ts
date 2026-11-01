export type PartKey = "morning" | "day" | "evening"

export type Part = {
  key: PartKey
  label: string
  hours: string
  low: string
  span: string
  from: number
  to: number
}

export type Day = {
  iso: string
  dow: string
  dowFull: string
  num: string
  long: string
  short: string
  isToday: boolean
}

export type Slot = { id: string; day: Day; part: Part; past: boolean }

export const parts: Part[] = [
  {
    key: "morning",
    label: "Утро",
    hours: "09–14",
    low: "утро",
    span: "09:00–14:00",
    from: 9,
    to: 14,
  },
  { key: "day", label: "День", hours: "14–19", low: "день", span: "14:00–19:00", from: 14, to: 19 },
  {
    key: "evening",
    label: "Вечер",
    hours: "19–23",
    low: "вечер",
    span: "19:00–23:00",
    from: 19,
    to: 23,
  },
]

export const weeks = 3
export const daysPerWeek = 7
export const totalDays = weeks * daysPerWeek
export const totalSlots = totalDays * parts.length

const zone = "Europe/Moscow"

const months = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
]

const monthsShort = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
]

const dows = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

const dowsFull = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]

// Календарь живёт в поясе сообщества, а не в поясе телефона: иначе у человека
// в другой зоне «сегодня» и прошедшие слоты разъехались бы с теми, что видит бот.
const zoned = (at: Date) => {
  const parsed = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(at)

  const get = (type: string) => parsed.find(piece => piece.type === type)?.value ?? ""

  return {
    iso: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) % 24,
  }
}

const dayFromIso = (iso: string, todayIso: string): Day => {
  const [year, month, day] = iso.split("-").map(Number)
  const at = new Date(Date.UTC(year!, month! - 1, day!))
  const index = at.getUTCDay()

  return {
    iso,
    dow: dows[index]!,
    dowFull: dowsFull[index]!,
    num: String(day),
    long: `${day} ${months[month! - 1]}`,
    short: `${dows[index]}, ${day} ${monthsShort[month! - 1]}`,
    isToday: iso === todayIso,
  }
}

const shiftIso = (iso: string, days: number) => {
  const [year, month, day] = iso.split("-").map(Number)
  const at = new Date(Date.UTC(year!, month! - 1, day! + days))
  return at.toISOString().slice(0, 10)
}

export const slotId = (iso: string, part: PartKey) => `${iso}:${part}`

export const buildDays = (now = new Date()): Day[] => {
  const today = zoned(now)
  const [year, month, day] = today.iso.split("-").map(Number)
  const index = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay()
  const start = shiftIso(today.iso, index === 0 ? -6 : 1 - index)

  return [...Array(totalDays).keys()].map(offset => dayFromIso(shiftIso(start, offset), today.iso))
}

export const buildSlots = (days: Day[], now = new Date()): Slot[] => {
  const today = zoned(now)

  return days.flatMap(day =>
    parts.map(part => ({
      id: slotId(day.iso, part.key),
      day,
      part,
      past: day.iso < today.iso || (day.iso === today.iso && today.hour >= part.to),
    })),
  )
}

export const weekTitle = (days: Day[], week: number) => {
  const first = days[week * daysPerWeek]
  const last = days[week * daysPerWeek + daysPerWeek - 1]
  return first && last ? `${first.long} — ${last.long}` : ""
}

// Короткий месяц берём свой: Intl отдаёт «нояб.» вместо «ноя».
export const dayOf = (iso: string): Day => dayFromIso(iso, "")

export const partOfHour = (hour: number): Part =>
  parts.find(part => hour < part.to) ?? parts[parts.length - 1]!

export const slotIdOf = (iso: string, hour: number) => slotId(iso, partOfHour(hour).key)

export const isoAndHour = (at: string) => zoned(new Date(at))

// Сколько палец может уехать, чтобы это всё ещё считалось нажатием, а не
// протяжкой экрана мини-аппа.
export const tapSlack = 10

export const isTap = (from: { x: number; y: number }, to: { x: number; y: number }): boolean =>
  Math.abs(to.x - from.x) <= tapSlack && Math.abs(to.y - from.y) <= tapSlack

export const plural = (count: number, forms: [string, string, string]) => {
  const ones = count % 10
  const tens = count % 100
  if (ones === 1 && tens !== 11) return forms[0]
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return forms[1]
  return forms[2]
}
