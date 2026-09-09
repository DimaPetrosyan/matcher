import { StepHead } from "../components/StepHead"
import { copy } from "../copy"
import type { Profile } from "../types"

type Props = { profile: Profile; onEdit: () => void }

const labelsOf = (keys: string[], catalog: { key: string; label: string }[]) =>
  catalog.filter(item => keys.includes(item.key)).map(item => item.label)

export const ProfileView = ({ profile, onEdit }: Props) => {
  const { catalog, selected } = profile

  const interests = labelsOf(selected.interests, catalog.interests)
  const slots = labelsOf(selected.slots, catalog.slots)
  const district = catalog.districts.find(item => item.key === selected.district)?.label
  const radius = catalog.radii.find(item => item.key === selected.radius)?.label

  const where = [district, radius?.toLowerCase()].filter(Boolean).join(", ")

  const line = (key: string, value: string) => (
    <div className="line">
      <span className="k">{key}</span>
      <span>{value || copy.profile.nothing}</span>
    </div>
  )

  return (
    <>
      <StepHead title={copy.profile.title} subtitle={copy.profile.subtitle} />

      <div className="card summary">
        {line(copy.profile.interests, interests.join(", "))}
        {line(copy.profile.when, slots.join(" · "))}
        {line(copy.profile.where, where)}
      </div>

      <div className="card">
        <button type="button" className="row" onClick={onEdit}>
          <span className="grow">{copy.profile.edit}</span>
          <span className="aside">→</span>
        </button>
      </div>
    </>
  )
}
