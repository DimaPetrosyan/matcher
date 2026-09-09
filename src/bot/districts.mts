import type { TextKey } from "../i18n/index.mts"

export const districts = [
  { key: "north", textKey: "districtNorth" },
  { key: "center", textKey: "districtCenter" },
  { key: "south", textKey: "districtSouth" },
  { key: "west", textKey: "districtWest" },
  { key: "east", textKey: "districtEast" },
] as const satisfies readonly { key: string; textKey: TextKey }[]

export type DistrictKey = (typeof districts)[number]["key"]

export const radii = [
  { key: "near", textKey: "radiusNear", subTextKey: "radiusNearSub" },
  { key: "thirty", textKey: "radiusThirty", subTextKey: "radiusThirtySub" },
  { key: "any", textKey: "radiusAny", subTextKey: "radiusAnySub" },
] as const satisfies readonly { key: string; textKey: TextKey; subTextKey: TextKey }[]

export type RadiusKey = (typeof radii)[number]["key"]

const districtKeys = new Set<string>(districts.map(item => item.key))
const radiusKeys = new Set<string>(radii.map(item => item.key))

export const isDistrictKey = (value: string): value is DistrictKey => districtKeys.has(value)
export const isRadiusKey = (value: string): value is RadiusKey => radiusKeys.has(value)
