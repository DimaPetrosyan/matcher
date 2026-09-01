import type { TextKey } from "../i18n/index.mts"

export type SlotGroup = "weekday" | "weekend"

export type Slot = {
  key: string
  textKey: TextKey
  group: SlotGroup
  recurrence: string
  startTime: string
  endTime: string
}

const weekdayEvening = { startTime: "19:00:00", endTime: "23:00:00" }
const weekendDay = { startTime: "12:00:00", endTime: "16:00:00" }
const weekendEvening = { startTime: "16:00:00", endTime: "23:00:00" }

export const slots = [
  {
    key: "monEve",
    textKey: "slotMon",
    group: "weekday",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO",
    ...weekdayEvening,
  },
  {
    key: "tueEve",
    textKey: "slotTue",
    group: "weekday",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TU",
    ...weekdayEvening,
  },
  {
    key: "wedEve",
    textKey: "slotWed",
    group: "weekday",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=WE",
    ...weekdayEvening,
  },
  {
    key: "thuEve",
    textKey: "slotThu",
    group: "weekday",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TH",
    ...weekdayEvening,
  },
  {
    key: "friEve",
    textKey: "slotFri",
    group: "weekday",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=FR",
    ...weekdayEvening,
  },
  {
    key: "satDay",
    textKey: "slotSatDay",
    group: "weekend",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA",
    ...weekendDay,
  },
  {
    key: "satEve",
    textKey: "slotSatEve",
    group: "weekend",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SA",
    ...weekendEvening,
  },
  {
    key: "sunDay",
    textKey: "slotSunDay",
    group: "weekend",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
    ...weekendDay,
  },
  {
    key: "sunEve",
    textKey: "slotSunEve",
    group: "weekend",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=SU",
    ...weekendEvening,
  },
] as const satisfies readonly Slot[]

export type SlotKey = (typeof slots)[number]["key"]

const byKey = new Map(slots.map(slot => [slot.key as string, slot]))

export const isSlotKey = (value: string): value is SlotKey => byKey.has(value)

export const slotByKey = (key: SlotKey) => byKey.get(key)!

export type SlotRow = { recurrence: string | null; startTime: string | null }

export const slotKeyOf = (row: SlotRow): SlotKey | null =>
  slots.find(slot => slot.recurrence === row.recurrence && slot.startTime === row.startTime)?.key ??
  null

export const slotKeysOf = (rows: SlotRow[]): SlotKey[] => {
  const keys = new Set(rows.map(slotKeyOf).filter((key): key is SlotKey => key !== null))
  return slots.filter(slot => keys.has(slot.key)).map(slot => slot.key)
}
