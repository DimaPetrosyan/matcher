import { Chip } from "../components/Chip"
import { StepHead } from "../components/StepHead"
import { copy } from "../copy"
import { haptic } from "../telegram"
import type { InterestItem, RadiusItem } from "../types"

type Props = {
  districts: InterestItem[]
  radii: RadiusItem[]
  district: string | null
  radius: string | null
  onDistrict: (key: string) => void
  onRadius: (key: string) => void
}

export const Area = ({ districts, radii, district, radius, onDistrict, onRadius }: Props) => (
  <>
    <StepHead {...copy.steps.area} />

    <div className="group-title" style={{ margin: "0 0 4px" }}>
      {copy.groups.district}
    </div>
    <div className="chip-row" style={{ margin: "0 0 20px" }}>
      {districts.map(item => (
        <Chip
          key={item.key}
          label={item.label}
          on={district === item.key}
          role="radio"
          onToggle={() => {
            haptic.select()
            onDistrict(item.key)
          }}
        />
      ))}
    </div>

    <div className="group-title">{copy.groups.radius}</div>
    <div className="card" role="radiogroup">
      {radii.map(item => (
        <button
          key={item.key}
          type="button"
          className={`row ${radius === item.key ? "on" : ""}`}
          role="radio"
          aria-checked={radius === item.key}
          onClick={() => {
            haptic.select()
            onRadius(item.key)
          }}
        >
          <span className={`dot ${radius === item.key ? "on" : ""}`} />
          <span className="grow">{item.label}</span>
          <span className="aside">{item.sub}</span>
        </button>
      ))}
    </div>
  </>
)
