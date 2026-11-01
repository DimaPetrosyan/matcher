import type { ReactNode } from "react"
import { Icon } from "../components/Icon"
import { shadeOf } from "../activities"
import { plural } from "../calendar"
import { copy } from "../copy"
import type { Meeting as Data } from "../types"

const chips = {
  pending: null,
  going: [copy.meet.chip.going, "out"],
  confirmed: [copy.meet.chip.confirmed, "acc"],
  declined: [copy.meet.chip.declined, "mute"],
  full: [copy.meet.chip.full, "mute"],
  failed: [copy.meet.chip.failed, "mute"],
} as const

const lineOf = (meeting: Data) => {
  const people = plural(meeting.min, copy.people)

  if (meeting.status === "declined")
    return copy.meet.line.declined.replace("{until}", meeting.until.replace(/^ещё [^,]+, /, ""))
  if (meeting.status === "going")
    return copy.meet.line.going.replace("{min}", String(meeting.min)).replace("{people}", people)
  if (meeting.status === "full") return copy.meet.line.full
  if (meeting.status === "failed")
    return copy.meet.line.failed
      .replace("{going}", String(meeting.going))
      .replace("{min}", String(meeting.min))

  return ""
}

type Props = {
  meeting: Data
  past: boolean
  onBack: () => void
  onDecline: () => void
  onExit: () => void
}

export const Meeting = ({ meeting, past, onBack, onDecline, onExit }: Props) => {
  const me = meeting.status === "going" || meeting.status === "confirmed"
  const chip = chips[meeting.status]
  const line = lineOf(meeting)
  const shade = shadeOf(meeting.key)

  // Статус идёт первой строкой над участниками — у любой встречи. У набирающейся
  // следом «сколько нас» и «сколько нужно»: сперва где мы, потом сколько добрать.
  // У состоявшейся обе строки лишние: список участников идёт прямо под статусом.
  const rows: [string, ReactNode][] = []

  if (chip) rows.push([copy.meet.statusRow, <span className={`st ${chip[1]}`}>{chip[0]}</span>])

  if (meeting.status !== "confirmed") {
    rows.push([
      copy.meet.goingRow,
      !me
        ? String(meeting.going)
        : meeting.going === 1
          ? copy.meet.you
          : copy.meet.withYou.replace("{count}", String(meeting.going)),
    ])

    rows.push([
      copy.meet.needRow,
      meeting.min === meeting.max
        ? `${meeting.min} ${plural(meeting.min, copy.people)}`
        : `от ${meeting.min} до ${meeting.max} человек`,
    ])

    if (meeting.status === "pending" || meeting.status === "declined")
      rows.push([copy.meet.answerRow, meeting.until])
  }

  const people =
    meeting.status === "confirmed"
      ? [{ name: copy.meet.you, username: null }, ...meeting.others]
      : []

  return (
    <div className="mpage">
      <div className="mtop">
        <div className="mhead">
          <Icon name={shade.icon} size={24} />
          <span className="title">{meeting.act}</span>
        </div>
        <div className="mdate">{meeting.dateLong}</div>
        <div className="mtime">{meeting.partLabel}</div>
      </div>

      {rows.length ? (
        <div className="rows">
          {rows.map(([key, value]) => (
            <div className="r" key={key}>
              <span className="k">{key}</span>
              <span className="v">{value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {people.length ? (
        <div className="mgroup">
          <div className="grp">
            {copy.meet.people} · {meeting.going}
          </div>
          <div className="card flat">
            {people.map((person, index) => (
              <div className="person" key={`${person.name}-${index}`}>
                <span className="ini">{person.name.slice(0, 1)}</span>
                <span className="who">
                  <span className="nm">{person.name}</span>
                  {person.username ? <span className="at">@{person.username}</span> : null}
                </span>
                {person.username ? (
                  <a href={`https://t.me/${person.username}`} target="_blank" rel="noreferrer">
                    {copy.meet.write}
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mfoot">
        {line ? (
          <div className="info">
            <Icon name="info" size={20} />
            <span>{line}</span>
          </div>
        ) : null}

        <div className="macts">
          <button type="button" className="btn outline" onClick={onBack}>
            {copy.meet.back}
          </button>

          {!past && me ? (
            <button type="button" className="btn outline danger" onClick={onExit}>
              {copy.meet.leave}
            </button>
          ) : null}

          {!past && meeting.status === "pending" ? (
            <button type="button" className="btn outline" onClick={onDecline}>
              {copy.meet.decline}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
