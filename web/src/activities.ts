export type Group = "sport" | "rest" | "art"

export type Shade = { icon: string; soft: string; strong: string }

// Цвет несёт группу, иконка — занятие. Девять цветов человек не запоминает,
// три запоминает; подробность всё равно даёт иконка.
const groups: Record<string, Group> = {
  bike: "sport",
  run: "sport",
  tennis: "sport",
  billiards: "sport",
  bar: "rest",
  karaoke: "rest",
  hookah: "rest",
  walk: "rest",
  movie: "art",
  theatre: "art",
  expo: "art",
  lecture: "art",
}

const icons: Record<string, string> = {
  bike: "directions_bike",
  run: "directions_run",
  tennis: "sports_tennis",
  billiards: "adjust",
  bar: "local_bar",
  karaoke: "mic",
  hookah: "science",
  walk: "pets",
  movie: "movie",
  theatre: "theater_comedy",
  expo: "museum",
  lecture: "school",
}

// Порядок групп в шторке; занятия внутри идут в порядке справочника.
export const order: Group[] = ["sport", "rest", "art"]

export const groupOf = (key: string): Group => groups[key] ?? "rest"

export const shadeOf = (key: string): Shade => {
  const group = groupOf(key)

  return {
    icon: icons[key] ?? "event",
    soft: `var(--grp-${group}-soft)`,
    strong: `var(--grp-${group}-strong)`,
  }
}

export const onStrong = "var(--on-strong)"
