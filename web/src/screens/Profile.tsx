import { copy } from "../copy"

type Props = { paused: boolean; onToggle: () => void }

export const Profile = ({ paused, onToggle }: Props) => (
  <>
    <div className="title" style={{ margin: "4px 0 14px" }}>
      {copy.profile.title}
    </div>
    <button
      type="button"
      className="switch-row"
      role="switch"
      aria-checked={paused}
      onClick={onToggle}
    >
      <span className="grow">
        <span className="k">{copy.profile.pause}</span>
        <span className="v">{paused ? copy.profile.pauseOn : copy.profile.pauseOff}</span>
      </span>
      <span className={`switch ${paused ? "on" : ""}`}>
        <span className="track" />
        <span className="knob" />
      </span>
    </button>
  </>
)
