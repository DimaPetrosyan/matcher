type Props = { label: string; on: boolean; role?: "radio"; onToggle: () => void }

export const Chip = ({ label, on, role, onToggle }: Props) => (
  <button
    type="button"
    className="tap"
    onClick={onToggle}
    role={role}
    {...(role === "radio" ? { "aria-checked": on } : { "aria-pressed": on })}
  >
    <span className={`chip ${on ? "on" : ""}`}>
      {on ? <span className="mark">✓</span> : null}
      {label}
    </span>
  </button>
)
