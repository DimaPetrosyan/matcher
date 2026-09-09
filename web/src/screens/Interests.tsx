import { useState } from "react"
import { Chip } from "../components/Chip"
import { StepHead } from "../components/StepHead"
import { copy } from "../copy"
import { haptic } from "../telegram"
import type { InterestItem } from "../types"

type Props = {
  catalog: InterestItem[]
  selected: string[]
  suggestions: string[]
  limits: { suggestionLimit: number; suggestionMaxLength: number }
  onToggle: (key: string) => void
  onAdd: (body: string) => void
  onRemove: (body: string) => void
}

export const Interests = ({
  catalog,
  selected,
  suggestions,
  limits,
  onToggle,
  onAdd,
  onRemove,
}: Props) => {
  const [draft, setDraft] = useState("")

  const full = suggestions.length >= limits.suggestionLimit
  const tooLong = draft.length > limits.suggestionMaxLength

  const submit = () => {
    const body = draft.trim()
    if (!body || tooLong || full) return
    onAdd(body)
    setDraft("")
  }

  return (
    <>
      <StepHead {...copy.steps.interests} />

      <div className="chip-row" style={{ margin: "-4px 0 12px" }}>
        {catalog.map(item => (
          <Chip
            key={item.key}
            label={item.label}
            on={selected.includes(item.key)}
            onToggle={() => {
              haptic.select()
              onToggle(item.key)
            }}
          />
        ))}
      </div>

      {suggestions.length > 0 ? (
        <div className="chip-row" style={{ margin: "-4px 0 8px" }}>
          {suggestions.map(body => (
            <div key={body} className="tap" style={{ cursor: "default" }}>
              <span className="chip-custom">
                <span className="label">{body}</span>
                <button
                  type="button"
                  aria-label={copy.suggestions.remove}
                  onClick={() => {
                    haptic.remove()
                    onRemove(body)
                  }}
                >
                  ✕
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <input
        className={`field ${tooLong ? "invalid" : ""}`}
        value={draft}
        disabled={full}
        placeholder={full ? copy.suggestions.placeholderFull : copy.suggestions.placeholder}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") submit()
        }}
      />

      <p className={`hint ${tooLong ? "warn" : ""}`}>
        {tooLong
          ? copy.suggestions.tooLong(limits.suggestionMaxLength, draft.length)
          : full
            ? copy.suggestions.full
            : copy.suggestions.hint}
      </p>
    </>
  )
}
