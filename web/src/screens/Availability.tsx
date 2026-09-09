import { StepHead } from "../components/StepHead"
import { copy } from "../copy"
import { haptic } from "../telegram"
import type { SlotItem } from "../types"

type Props = { catalog: SlotItem[]; selected: string[]; onToggle: (key: string) => void }

const split = (label: string) => {
  const space = label.indexOf(" ")
  return space < 0 ? { head: label, sub: "" } : {
    head: label.slice(0, space),
    sub: label.slice(space + 1),
  }
}

const Cell = ({
  slot,
  on,
  onToggle,
}: {
  slot: SlotItem
  on: boolean
  onToggle: () => void
}) => {
  const { head, sub } = split(slot.label)

  return (
    <button
      type="button"
      className={`cell ${on ? "on" : ""} ${sub ? "tall" : ""}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      <span className="top">
        {on ? <span className="mark">✓</span> : null}
        <span>{head}</span>
      </span>
      {sub ? <span className="sub">{sub}</span> : null}
    </button>
  )
}

export const Availability = ({ catalog, selected, onToggle }: Props) => {
  const weekday = catalog.filter(slot => slot.group === "weekday")
  const weekend = catalog.filter(slot => slot.group === "weekend")

  const cell = (slot: SlotItem) => (
    <Cell
      key={slot.key}
      slot={slot}
      on={selected.includes(slot.key)}
      onToggle={() => {
        haptic.select()
        onToggle(slot.key)
      }}
    />
  )

  return (
    <>
      <StepHead {...copy.steps.availability} />

      <div className="group-title">{copy.groups.weekday}</div>
      <div className="days weekday">{weekday.map(cell)}</div>

      <div className="group-title">{copy.groups.weekend}</div>
      <div className="days weekend">{weekend.map(cell)}</div>
    </>
  )
}
