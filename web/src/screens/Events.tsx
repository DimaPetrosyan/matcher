import { copy } from "../copy"
import { haptic } from "../telegram"
import type { UserEvent } from "../types"

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("ru", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso))

const shortFmt = (iso: string) =>
  new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso))

const stateOf = (event: UserEvent) => {
  if (event.status === "cancelled") return copy.events.status.cancelled
  if (event.myStatus === "declined") return copy.events.status.declined
  if (event.myStatus === "closed") return copy.events.status.closed
  if (event.status === "confirmed" && event.myStatus === "accepted")
    return copy.events.status.confirmed
  if (event.myStatus === "accepted") return copy.events.status.accepted
  return copy.events.status.invited
}

const tone = (event: UserEvent) =>
  event.status === "cancelled" || event.myStatus === "declined" || event.myStatus === "closed"
    ? "muted"
    : event.myStatus === "accepted"
      ? "on"
      : ""

type Props = {
  events: UserEvent[]
  busy: string | null
  highlight: string | null
  onAnswer: (eventId: string, going: boolean) => void
}

export const Events = ({ events, busy, highlight, onAnswer }: Props) => {
  if (events.length === 0) {
    return (
      <div className="state">
        <div className="glyph">·</div>
        <div className="t">{copy.events.empty}</div>
        <div className="d">{copy.events.emptyText}</div>
      </div>
    )
  }

  return (
    <>
      <h1 className="title">{copy.events.title}</h1>
      <p className="subtitle">{copy.events.subtitle}</p>

      <div className="event-list">
        {events.map(event => {
          const open = event.myStatus === "invited" && event.status !== "cancelled"
          const roster = event.roster.filter(person => person.firstName || person.username)

          return (
            <div
              key={event.id}
              className={`card event ${highlight === event.id ? "lit" : ""}`}
            >
              <div className="event-head">
                <span className="event-title">{event.label}</span>
                <span className={`badge ${tone(event)}`}>{stateOf(event)}</span>
              </div>

              <div className="event-when">{fmt(event.startsAt)}</div>

              <div className="event-meta">
                {copy.events.needed
                  .replace("{min}", String(event.minSize))
                  .replace("{max}", String(event.maxSize))}
                {" · "}
                {copy.events.already.replace("{going}", String(event.going))}
              </div>

              {event.myStatus === "accepted" && roster.length > 0 ? (
                <div className="event-roster">
                  <span className="k">{copy.events.withYou}</span>
                  {roster.map((person, index) => (
                    <span key={index}>
                      {person.username ? (
                        <a href={`https://t.me/${person.username}`} target="_blank" rel="noreferrer">
                          {person.firstName ?? person.username}
                        </a>
                      ) : (
                        (person.firstName ?? "—")
                      )}
                      {index < roster.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              ) : null}

              {open ? (
                <>
                  <div className="event-meta">
                    {copy.events.answerBy.replace("{deadline}", shortFmt(event.respondUntil))}
                  </div>
                  <div className="event-actions">
                    <button
                      type="button"
                      className="act primary"
                      disabled={busy === event.id}
                      onClick={() => {
                        haptic.select()
                        onAnswer(event.id, true)
                      }}
                    >
                      {copy.events.going}
                    </button>
                    <button
                      type="button"
                      className="act"
                      disabled={busy === event.id}
                      onClick={() => {
                        haptic.select()
                        onAnswer(event.id, false)
                      }}
                    >
                      {copy.events.skip}
                    </button>
                  </div>
                </>
              ) : null}

              {event.myStatus === "accepted" && event.status === "confirmed" ? (
                <div className="event-meta">{copy.events.noPlace}</div>
              ) : null}
            </div>
          )
        })}
      </div>
    </>
  )
}
