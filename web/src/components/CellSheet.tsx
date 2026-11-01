import { Icon } from "./Icon"
import { Sheet } from "./Sheet"
import { copy } from "../copy"
import { groupOf, order, shadeOf } from "../activities"
import type { InterestItem } from "../types"

type Props = {
  title: string
  catalog: InterestItem[]
  draft: string[]
  dirty: boolean
  onToggle: (key: string) => void
  onSelectAll: (keys: string[]) => void
  onRemove: () => void
  onSave: () => void
  onClose: () => void
}

export const CellSheet = ({
  title,
  catalog,
  draft,
  dirty,
  onToggle,
  onSelectAll,
  onRemove,
  onSave,
  onClose,
}: Props) => {
  const all = draft.length === catalog.length

  return (
    <Sheet onClose={onClose}>
      {close => (
        <>
          <div className="sheet-head">
            <div className="t">{title}</div>
            <button
              type="button"
              onClick={() => onSelectAll(all ? [] : catalog.map(item => item.key))}
            >
              {all ? copy.sheet.clearAll : copy.sheet.selectAll}
            </button>
          </div>

          <div className="sheet-sub">{copy.sheet.hint}</div>

          <div style={{ height: 14 }} />

          <div className="picks">
            {order.flatMap(group => {
              const items = catalog.filter(item => groupOf(item.key) === group)
              if (!items.length) return []

              return [
                <div
                  key={group}
                  className="grp-head"
                  style={{ color: `var(--grp-${group}-strong)` }}
                >
                  {copy.groups[group]}
                </div>,

                <div key={`${group}-chips`} className="chips">
                  {items.map(item => {
                    const on = draft.includes(item.key)
                    const shade = shadeOf(item.key)

                    return (
                      <button
                        type="button"
                        key={item.key}
                        className={`chip ${on ? "on" : ""}`}
                        aria-pressed={on}
                        onClick={() => onToggle(item.key)}
                      >
                        <span
                          className="pill"
                          style={
                            on
                              ? {
                                  background: shade.soft,
                                  borderColor: shade.strong,
                                  color: shade.strong,
                                }
                              : undefined
                          }
                        >
                          <Icon name={shade.icon} size={16} />
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>,
              ]
            })}
          </div>

          <div className="sheet-acts">
            <button type="button" className="btn outline danger" onClick={() => close(onRemove)}>
              {copy.sheet.remove}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!dirty}
              onClick={() => close(onSave)}
            >
              {copy.sheet.save}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
