export type Scheme = "light" | "dark"

export type FlowStep = "interests" | "availability" | "area"

export type InterestItem = { key: string; label: string }

export type SlotItem = {
  key: string
  label: string
  group: "weekday" | "weekend"
  startTime: string
  endTime: string
}

export type RadiusItem = { key: string; label: string; sub: string }

export type Catalog = {
  interests: InterestItem[]
  slots: SlotItem[]
  districts: InterestItem[]
  radii: RadiusItem[]
}

export type Profile = {
  step: FlowStep | "done"
  status: string
  flow: FlowStep[]
  catalog: Catalog
  selected: {
    interests: string[]
    slots: string[]
    district: string | null
    radius: string | null
  }
  suggestions: string[]
  limits: { suggestionLimit: number; suggestionMaxLength: number }
}

export type AccessProblem =
  | { kind: "notMember" }
  | { kind: "lost"; community?: string }
  | { kind: "unverifiable" }
  | { kind: "notRegistered" }
  | { kind: "unauthorized" }
  | { kind: "offline" }
