import { copy } from "../copy"
import type { Meeting } from "../types"

export type ArchiveRow = { id: string; act: string; when: string; chip: string; kind: string }

export const archiveRows = (meetings: Meeting[], pastSlots: Set<string>): ArchiveRow[] =>
  meetings
    .filter(
      meeting =>
        meeting.status === "declined" ||
        meeting.status === "failed" ||
        meeting.status === "full" ||
        pastSlots.has(meeting.slot),
    )
    .slice()
    .sort((a, b) => b.slot.localeCompare(a.slot))
    .map(meeting => {
      const past = pastSlots.has(meeting.slot)

      const [chip, kind] =
        meeting.status === "declined"
          ? [copy.meet.chip.declined, "mute"]
          : meeting.status === "failed"
            ? [copy.meet.chip.failed, "mute"]
            : meeting.status === "full"
              ? [copy.archive.missed, "mute"]
              : past
                ? [copy.archive.passed, "out"]
                : [copy.meet.chip.confirmed, "acc"]

      return {
        id: meeting.id,
        act: meeting.act,
        when: `${meeting.dateLong} · ${meeting.partLow}`,
        chip,
        kind,
      }
    })

type Props = { rows: ArchiveRow[]; onOpen: (id: string) => void }

export const Archive = ({ rows, onOpen }: Props) => (
  <>
    <div className="title" style={{ margin: "4px 0 0" }}>
      {copy.archive.title}
    </div>
    <div className="sub" style={{ margin: "4px 0 16px" }}>
      {copy.archive.subtitle}
    </div>
    <div className="card">
      {rows.map(row => (
        <button type="button" className="arch-row" key={row.id} onClick={() => onOpen(row.id)}>
          <span className="who">
            <span className="act">{row.act}</span>
            <span className="when">{row.when}</span>
          </span>
          <span className={`st ${row.kind}`}>{row.chip}</span>
        </button>
      ))}
    </div>
  </>
)
