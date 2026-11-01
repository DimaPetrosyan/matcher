import { Fragment, useEffect, useRef } from "react"
import { Icon } from "../components/Icon"
import { groupOf, onStrong, shadeOf } from "../activities"
import { daysPerWeek, isTap, parts, weeks, weekTitle } from "../calendar"
import type { Day, Part, Slot } from "../calendar"
import type { Meeting } from "../types"

type Props = {
  days: Day[]
  slots: Slot[]
  week: number
  onWeek: (direction: number) => void
  cells: Record<string, string[]>
  meetings: Meeting[]
  pastSlots: Set<string>
  onSlot: (slot: Slot) => void
  onMeeting: (meeting: Meeting) => void
  onDay: (day: Day) => void
  onPart: (part: Part) => void
}

type Kind = "" | "plan" | "ask" | "ev"

const kindOf = (slot: Slot, meeting: Meeting | undefined, asked: number, planned: number): Kind => {
  if (meeting) return "ev"
  if (asked) return "ask"
  if (slot.past) return ""
  return planned ? "plan" : ""
}

// Кружочки показывают группы, а не занятия: групп всего три, поэтому
// повторы схлопываются и «+N» больше не нужен.
const Dots = ({ keys }: { keys: string[] }) => (
  <span className="dots">
    {[...new Set(keys.map(groupOf))].map(group => (
      <i key={group} style={{ background: `var(--grp-${group}-strong)` }} />
    ))}
  </span>
)

export const Calendar = ({
  days,
  slots,
  week,
  onWeek,
  cells,
  meetings,
  pastSlots,
  onSlot,
  onMeeting,
  onDay,
  onPart,
}: Props) => {
  const grid = useRef<HTMLDivElement>(null)
  const previous = useRef(week)
  const from = useRef<{ x: number; y: number; id: string | null } | null>(null)

  useEffect(() => {
    const node = grid.current
    const from = previous.current
    previous.current = week

    if (from === week || !node?.animate) return

    node.animate(
      [
        { transform: `translateY(${week > from ? 28 : -28}px)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
    )
  }, [week])

  const byId = new Map(slots.map(slot => [slot.id, slot]))
  // Занятый слот держит одна встреча, а пока он свободен, приглашений может
  // прийти несколько — по разным занятиям на одно и то же время.
  const bySlot = new Map<string, Meeting>()
  const asks = new Map<string, Meeting[]>()

  // В будущих ячейках рисуются только живые встречи: отказ и несостоявшийся набор
  // освобождают время, а в прошедших показываем любую — это уже история.
  const rank = { confirmed: 2, going: 1 } as Record<string, number>

  for (const meeting of meetings) {
    const taken = rank[meeting.status] != null
    const gone = pastSlots.has(meeting.slot)

    if (taken || gone) {
      const kept = bySlot.get(meeting.slot)
      if (!kept || (rank[meeting.status] ?? 0) > (rank[kept.status] ?? 0)) {
        bySlot.set(meeting.slot, meeting)
      }
      continue
    }

    if (meeting.status === "pending")
      asks.set(meeting.slot, [...(asks.get(meeting.slot) ?? []), meeting])
  }

  const hit = (event: React.PointerEvent) => {
    const under = document.elementFromPoint(event.clientX, event.clientY)
    const cell = under?.closest?.("[data-slot]")
    return cell?.getAttribute("data-slot") ?? null
  }

  const down = (event: React.PointerEvent) => {
    from.current = { x: event.clientX, y: event.clientY, id: hit(event) }
  }

  const cancel = () => {
    from.current = null
  }

  const up = (event: React.PointerEvent) => {
    const started = from.current
    from.current = null
    if (!started) return

    // Экран мини-аппа тянут вниз — палец уезжает, и отрыв не должен считаться
    // нажатием. Нажатие — это когда отпустили там же, где нажали.
    const id = hit(event)
    if (!isTap(started, { x: event.clientX, y: event.clientY })) return

    if (!id || id !== started.id) return

    // Прошедшие даты открываются наравне с будущими: посмотреть и доотметить
    // можно любую ячейку. Ячейка со встречей ведёт во встречу, а не в шторку.
    const slot = byId.get(id)
    if (!slot) return

    const meeting = bySlot.get(slot.id)
    if (meeting) onMeeting(meeting)
    else onSlot(slot)
  }

  const shown = days.slice(week * daysPerWeek, week * daysPerWeek + daysPerWeek)

  return (
    <>
      <div className="wk-row">
        <button
          type="button"
          className={`wk-nav ${week === 0 ? "edge" : ""}`}
          aria-label="Предыдущая неделя"
          onClick={() => onWeek(-1)}
        >
          <Icon name="keyboard_arrow_up" />
        </button>
        <span className="wk-title">{weekTitle(days, week)}</span>
        <button
          type="button"
          className={`wk-nav ${week === weeks - 1 ? "edge" : ""}`}
          aria-label="Следующая неделя"
          onClick={() => onWeek(1)}
        >
          <Icon name="keyboard_arrow_down" />
        </button>
      </div>

      <div className="cal-head">
        <div />
        {parts.map(part => (
          <button key={part.key} type="button" className="col-btn" onClick={() => onPart(part)}>
            {part.label}
          </button>
        ))}
      </div>

      <div className="gridwrap">
        <div
          ref={grid}
          className="grid"
          onPointerDown={down}
          onPointerUp={up}
          onPointerCancel={cancel}
        >
          {shown.map(day => {
            const row = parts.map(part => byId.get(`${day.iso}:${part.key}`)!)

            return (
              <Fragment key={day.iso}>
                <button
                  type="button"
                  className={`day ${day.isToday ? "today" : ""}`}
                  onClick={() => onDay(day)}
                >
                  <span className="dow">{day.dow}</span>
                  <span className="num">{day.num}</span>
                </button>

                {row.map(slot => {
                  const planned = cells[slot.id] ?? []
                  const meeting = bySlot.get(slot.id)
                  const asked = asks.get(slot.id) ?? []
                  const kind = kindOf(slot, meeting, asked.length, planned.length)
                  const shade = meeting ? shadeOf(meeting.key) : null
                  const done = !!meeting && (meeting.status === "confirmed" || slot.past)
                  const waiting = meeting?.status === "going" && meeting.going < meeting.min

                  return (
                    <div
                      key={slot.id}
                      data-slot={slot.id}
                      className={`cell ${kind} ${done ? "filled" : ""}`}
                      style={
                        kind === "ev" && shade
                          ? done
                            ? {
                                background: shade.strong,
                                borderColor: shade.strong,
                                color: onStrong,
                              }
                            : { background: shade.soft }
                          : undefined
                      }
                    >
                      {kind === "plan" ? (
                        <span className="stack">
                          <span className="sign">
                            <Icon name="hourglass_top" size={19} className="dim" />
                          </span>
                          <Dots keys={planned} />
                        </span>
                      ) : null}

                      {kind === "ask" ? (
                        <span className="stack">
                          <span className="sign">
                            <Icon name="report" size={19} fill className="alert" />
                          </span>
                          <Dots keys={asked.map(item => item.key)} />
                        </span>
                      ) : null}

                      {kind === "ev" && meeting && shade ? (
                        <>
                          {done ? null : (
                            <i className="strip" style={{ background: shade.strong }} />
                          )}
                          <span className="body">
                            <span className="nm">
                              <Icon name={shade.icon} size={13} />
                              <span>{meeting.act}</span>
                            </span>
                            <span className="cnt">
                              <Icon name="group" size={12} />
                              {meeting.going}
                              {waiting ? `/${meeting.min}` : null}
                            </span>
                          </span>
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>
    </>
  )
}
