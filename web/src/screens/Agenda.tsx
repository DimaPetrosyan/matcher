import { Icon } from "../components/Icon"
import { copy } from "../copy"
import { plural, totalSlots } from "../calendar"
import type { Meeting, MeetStatus } from "../types"

const chips: Record<MeetStatus, [string, string] | null> = {
  pending: null,
  going: [copy.meet.chip.going, "out"],
  confirmed: [copy.meet.chip.confirmed, "acc"],
  declined: [copy.meet.chip.declined, "mute"],
  full: [copy.meet.chip.full, "mute"],
  failed: [copy.meet.chip.failed, "mute"],
}

const cells = ["ячейка", "ячейки", "ячеек"] as [string, string, string]

export const MeetCard = ({
  meeting,
  lit,
  onOpen,
}: {
  meeting: Meeting
  lit: boolean
  onOpen: () => void
}) => {
  const chip = chips[meeting.status]

  return (
    <button type="button" className={`meet ${lit ? "lit" : ""}`} onClick={onOpen}>
      <div className="when">
        <span style={{ flex: 1 }}>
          {meeting.short} · {meeting.partLow}
        </span>
      </div>
      <div className="head">
        <span className="act">{meeting.act}</span>
        {chip ? <span className={`st ${chip[1]}`}>{chip[0]}</span> : null}
      </div>
    </button>
  )
}

const Skeletons = () => (
  <>
    <div className="skel" style={{ width: 110, height: 14, margin: "6px 0 12px" }} />
    <div className="cards" style={{ margin: "0 0 28px" }}>
      <div className="skel" style={{ height: 96, borderRadius: 14 }} />
      <div className="skel" style={{ height: 96, borderRadius: 14 }} />
    </div>
    <div className="skel" style={{ width: 80, height: 14, margin: "0 0 12px" }} />
    <div className="skel" style={{ height: 96, borderRadius: 14 }} />
  </>
)

type Props = {
  loading: boolean
  meetings: Meeting[]
  filled: number
  highlight: string | null
  onOpen: (meeting: Meeting) => void
  onArchive: () => void
  onCalendar: () => void
  onEvenings: () => void
}

export const Agenda = ({
  loading,
  meetings,
  filled,
  highlight,
  onOpen,
  onArchive,
  onCalendar,
  onEvenings,
}: Props) => {
  if (loading) return <Skeletons />

  const pending = meetings.filter(meeting => meeting.status === "pending")
  const next = meetings
    .filter(meeting => meeting.status !== "pending" && meeting.status !== "declined")
    .slice()
    .sort((a, b) => a.slot.localeCompare(b.slot))
  const declined = meetings.filter(meeting => meeting.status === "declined")
  const nothing = !pending.length && !next.length && !declined.length

  if (nothing && !filled) {
    return (
      <div className="empty">
        <div className="glyph">
          <Icon name="event_available" size={28} />
        </div>
        <div className="t">{copy.agenda.newTitle}</div>
        <div className="d dim">{copy.agenda.newText}</div>
        <div className="d">{copy.agenda.newHint}</div>
        <button type="button" className="btn primary wide lead" onClick={onCalendar}>
          {copy.agenda.openCalendar}
        </button>
      </div>
    )
  }

  if (nothing) {
    return (
      <div className="empty">
        <div className="glyph">
          <Icon name="group_search" size={28} />
        </div>
        <div className="t">{copy.agenda.missTitle}</div>
        <div className="d dim">
          {copy.agenda.missStats
            .replace("{filled}", String(filled))
            .replace("{cells}", plural(filled, cells))
            .replace("{total}", String(totalSlots))}
        </div>
        <div className="d">{copy.agenda.missHint}</div>
        <button type="button" className="btn primary wide lead" onClick={onEvenings}>
          {copy.agenda.markEvenings}
        </button>
        <button type="button" className="btn outline wide" onClick={onCalendar}>
          {copy.agenda.openCalendar}
        </button>
      </div>
    )
  }

  return (
    <>
      {pending.length ? (
        <>
          <div className="grp-row">
            <span className="grp accent">{copy.agenda.needAnswer}</span>
            <span className="badge">{pending.length}</span>
          </div>
          <div className="cards">
            {pending.map(meeting => (
              <MeetCard key={meeting.id} meeting={meeting} lit onOpen={() => onOpen(meeting)} />
            ))}
          </div>
        </>
      ) : null}

      {next.length ? (
        <>
          <div className="grp-row" style={{ margin: `${pending.length ? 22 : 4}px 0 8px` }}>
            <span className="grp">{copy.agenda.later}</span>
          </div>
          <div className="cards">
            {next.map(meeting => (
              <MeetCard
                key={meeting.id}
                meeting={meeting}
                lit={highlight === meeting.id}
                onOpen={() => onOpen(meeting)}
              />
            ))}
          </div>
        </>
      ) : null}

      <button type="button" className="arch-link" onClick={onArchive}>
        <Icon name="inventory_2" size={20} />
        <span>{copy.archive.title}</span>
      </button>
    </>
  )
}
