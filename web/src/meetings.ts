import { dayOf, isoAndHour, partOfHour, plural, slotIdOf } from "./calendar"
import type { Meeting, MeetStatus, UserEvent } from "./types"

const zone = "Europe/Moscow"

const at = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ru", { timeZone: zone, ...options }).format(new Date(iso))

const hhmm = (iso: string) => at(iso, { hour: "2-digit", minute: "2-digit" })

const shortOf = (at: string) => dayOf(isoAndHour(at).iso).short

const dayMonth = (at: string) => dayOf(isoAndHour(at).iso).long

const statusOf = (event: UserEvent): MeetStatus => {
  if (event.status === "cancelled") return "failed"
  if (event.myStatus === "declined") return "declined"
  if (event.myStatus === "closed") return "full"
  if (event.myStatus === "accepted") return event.status === "confirmed" ? "confirmed" : "going"
  return "pending"
}

const hours = ["час", "часа", "часов"] as const
const days = ["день", "дня", "дней"] as const

const untilText = (respondUntil: string, now: Date) => {
  const left = new Date(respondUntil).getTime() - now.getTime()
  const date = `до ${dayMonth(respondUntil)}`

  if (left <= 0) return `срок вышел, ${date}`

  const whole = Math.floor(left / 3600000)

  if (whole < 24) {
    const count = Math.max(1, whole)
    return `ещё ${count} ${plural(count, [...hours])}, ${date}`
  }

  const count = Math.floor(whole / 24)
  return `ещё ${count} ${plural(count, [...days])}, ${date}`
}

export const toMeeting = (event: UserEvent, now = new Date()): Meeting => {
  const { iso, hour } = isoAndHour(event.startsAt)
  const part = partOfHour(hour)

  return {
    id: event.id,
    key: event.interestKey,
    slot: slotIdOf(iso, hour),
    act: event.label,
    dateLong: `${dayOf(iso).dowFull}, ${dayOf(iso).long}`,
    short: shortOf(event.startsAt),
    partLow: part.low,
    partLabel: part.label,
    hours: `${hhmm(event.startsAt)}–${hhmm(event.endsAt)}`,
    min: event.minSize,
    max: event.maxSize,
    going: event.going,
    others: event.roster
      .filter(person => person.firstName || person.username)
      .map(person => ({
        name: person.firstName ?? person.username ?? "—",
        username: person.username,
      })),
    status: statusOf(event),
    until: untilText(event.respondUntil, now),
    deadline: `до ${dayOf(isoAndHour(event.respondUntil).iso).short.split(", ")[1]}`,
  }
}
