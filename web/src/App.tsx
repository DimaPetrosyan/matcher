import { useCallback, useEffect, useMemo, useState } from "react"
import { CellSheet } from "./components/CellSheet"
import { Sheet } from "./components/Sheet"
import { Icon } from "./components/Icon"
import { MainButton, type ButtonKind } from "./components/MainButton"
import { Toast } from "./components/Toast"
import { Agenda } from "./screens/Agenda"
import { Archive, archiveRows } from "./screens/Archive"
import { Block } from "./screens/Block"
import { Calendar } from "./screens/Calendar"
import { Meeting } from "./screens/Meeting"
import { Profile } from "./screens/Profile"
import { ApiError, api } from "./api"
import { buildDays, buildSlots, daysPerWeek, parts, weeks } from "./calendar"
import type { Day, Part, Slot } from "./calendar"
import { copy } from "./copy"
import { toMeeting } from "./meetings"
import { loadPlan, savePlan, type Plan } from "./plan"
import { applyScheme, haptic, tg } from "./telegram"
import type { AccessProblem, InterestItem, Meeting as MeetingData, Scheme } from "./types"

type View = "meetings" | "profile" | "meeting" | "archive"

type Pick = { keys: string[]; title: string; start: string[] }

// Ссылка из чата ведёт на конкретную встречу: подсвечиваем её в списке.
const wantedMeeting = new URLSearchParams(window.location.search).get("event")

const retryable = (problem: AccessProblem) =>
  problem.kind === "unverifiable" || problem.kind === "offline" || problem.kind === "noUsername"

const blockOf = (problem: AccessProblem) =>
  problem.kind === "lost" ? copy.access.lost : copy.access[problem.kind]

const toggle = (list: string[], key: string) =>
  list.includes(key) ? list.filter(item => item !== key) : [...list, key]

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every(item => b.includes(item))

export const App = () => {
  const [scheme, setScheme] = useState<Scheme>(tg?.colorScheme ?? "light")
  const [problem, setProblem] = useState<AccessProblem | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<InterestItem[]>([])
  const [meetings, setMeetings] = useState<MeetingData[]>([])
  const [plan, setPlan] = useState<Plan>(loadPlan)
  const [view, setView] = useState<View>("meetings")
  const [mode, setMode] = useState<"cal" | "list">("cal")
  const [week, setWeek] = useState(0)
  const [mid, setMid] = useState<string | null>(null)
  const [pick, setPick] = useState<Pick | null>(null)
  const [draft, setDraft] = useState<string[]>([])
  const [popup, setPopup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; action?: string } | null>(null)

  // Окно календаря и прошедшие слоты считаются один раз за сеанс: пересчёт на
  // каждый рендер сдвигал бы «сегодня» прямо под пальцем.
  const days = useMemo(() => buildDays(), [])
  const slots = useMemo(() => buildSlots(days), [days])
  const pastSlots = useMemo(
    () => new Set(slots.filter(slot => slot.past).map(slot => slot.id)),
    [slots],
  )
  const openSlots = useMemo(() => slots.filter(slot => !slot.past), [slots])

  const keep = (next: Plan) => {
    setPlan(next)
    savePlan(next)
  }

  const load = useCallback(async () => {
    setProblem(null)
    setLoading(true)

    try {
      const profile = await api.profile()
      setCatalog([...profile.catalog.interests])

      const stored = loadPlan()
      // Новому человеку отмечать нечем: по умолчанию включены все занятия,
      // как на пустом экране в макете.
      if (!stored.acts.length && !Object.keys(stored.cells).length) {
        keep({ ...stored, acts: profile.catalog.interests.map(item => item.key) })
      }

      const answer = await api.events()
      setMeetings(answer.events.map(event => toMeeting(event)))
    } catch (error) {
      if (error instanceof ApiError) setProblem(error.problem)
      else setProblem({ kind: "offline" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    tg?.ready()
    tg?.expand()
    // Иначе протяжка вниз сворачивает мини-апп вместо прокрутки календаря.
    // Метод с Bot API 7.7, на старых клиентах молча ничего не делает.
    tg?.disableVerticalSwipes?.()
    void load()
  }, [load])

  useEffect(() => {
    applyScheme(scheme)
  }, [scheme])

  useEffect(() => {
    const app = tg
    if (!app) return

    const onTheme = () => setScheme(app.colorScheme)
    app.onEvent("themeChanged", onTheme)

    return () => app.offEvent("themeChanged", onTheme)
  }, [])

  const back = useCallback(() => {
    setView("meetings")
    setPopup(false)
  }, [])

  const deep = view === "meeting" || view === "archive"
  const titled = view === "archive"

  useEffect(() => {
    const app = tg
    if (!app) return

    if (!deep) {
      app.BackButton.hide()
      return
    }

    app.BackButton.onClick(back)
    app.BackButton.show()

    return () => {
      app.BackButton.offClick(back)
      app.BackButton.hide()
    }
  }, [deep, back])

  const meeting = meetings.find(item => item.id === mid) ?? null
  const live = meetings.filter(item => !pastSlots.has(item.slot))
  const filled = Object.keys(plan.cells).filter(id => plan.cells[id]?.length).length
  const archive = archiveRows(meetings, pastSlots)

  const openPick = (keys: string[], title: string) => {
    if (!keys.length) return

    const first = plan.cells[keys[0]!] ?? []
    const uniform = keys.every(id => same(plan.cells[id] ?? [], first))

    const start = uniform ? [...first] : []

    setDraft(start)
    setPick({ keys, title, start })
    haptic.select()
  }

  const closePick = (mode: "save" | "remove" | "cancel") => {
    const chosen = pick
    setPick(null)
    if (!chosen || mode === "cancel") return

    const cells = { ...plan.cells }

    if (mode === "remove" || !draft.length) {
      chosen.keys.forEach(id => delete cells[id])
      keep({ ...plan, cells })
      return
    }

    chosen.keys.forEach(id => {
      cells[id] = [...draft]
    })

    // Последний сохранённый набор становится общим: так новая ячейка
    // открывается уже заполненной, а не пустой.
    keep({ ...plan, cells, acts: [...draft] })
  }

  const fill = (ids: string[]) => {
    if (!plan.acts.length) return

    const cells = { ...plan.cells }
    ids.forEach(id => {
      if (!cells[id]?.length) cells[id] = [...plan.acts]
    })
    keep({ ...plan, cells })
  }

  const answer = async (going: boolean, leaving: boolean) => {
    if (!meeting || busy) return

    setBusy(true)
    setPopup(false)

    try {
      await api.answerEvent(meeting.id, going)
      const next = await api.events()
      setMeetings(next.events.map(event => toMeeting(event)))

      if (leaving) {
        setView("meetings")
        setToast({ text: copy.meet.left.replace("{act}", meeting.act) })
      }

      haptic.done()
    } catch {
      haptic.failed()
      setToast({ text: copy.saveFailed.text, action: copy.saveFailed.action })
    } finally {
      setBusy(false)
    }
  }

  const button = ((): { label: string; kind: ButtonKind; onClick: () => void } | null => {
    if (problem)
      return {
        label: blockOf(problem).button,
        kind: "active",
        onClick: () => (retryable(problem) ? void load() : tg?.close()),
      }

    // На прошедшую встречу звать уже некуда — её можно только посмотреть.
    if (
      view === "meeting" &&
      meeting &&
      !pastSlots.has(meeting.slot) &&
      (meeting.status === "pending" || meeting.status === "declined")
    )
      return {
        label: meeting.status === "pending" ? copy.meet.go : copy.meet.goAnyway,
        kind: busy ? "loading" : "active",
        onClick: () => void answer(true, false),
      }

    return null
  })()

  const title = copy.archive.title

  const block = problem ? blockOf(problem) : null

  return (
    <div className="app">
      {titled ? (
        <div className="hdr">
          <div className="side">
            <button type="button" className="hdr-back" aria-label="Назад" onClick={back}>
              <Icon name="arrow_back" />
            </button>
          </div>
          <div className="ttl">{title}</div>
          <div className="side" />
        </div>
      ) : null}

      <div className="stage">
        <div
          className={`content ${!block && view === "meetings" && mode === "cal" ? "flush" : ""}`}
        >
          {block ? (
            <Block
              title={block.title}
              text={block.text}
              steps={"steps" in block ? block.steps : undefined}
            />
          ) : null}

          {!block && view === "meetings" ? (
            <>
              {mode === "cal" ? (
                <Calendar
                  days={days}
                  slots={slots}
                  week={week}
                  onWeek={direction =>
                    setWeek(current => Math.max(0, Math.min(weeks - 1, current + direction)))
                  }
                  cells={plan.cells}
                  meetings={meetings}
                  pastSlots={pastSlots}
                  onSlot={(slot: Slot) =>
                    openPick([slot.id], `${slot.day.long} · ${slot.part.low}`)
                  }
                  onMeeting={item => {
                    setMid(item.id)
                    setView("meeting")
                    setToast(null)
                  }}
                  onDay={(day: Day) =>
                    openPick(
                      parts.map(part => `${day.iso}:${part.key}`),
                      copy.sheet.dayTitle.replace("{day}", day.long),
                    )
                  }
                  onPart={(part: Part) =>
                    openPick(
                      days
                        .slice(week * daysPerWeek, week * daysPerWeek + daysPerWeek)
                        .map(day => `${day.iso}:${part.key}`),
                      copy.sheet.partTitle[part.key],
                    )
                  }
                />
              ) : (
                <Agenda
                  loading={loading}
                  meetings={live}
                  filled={filled}
                  highlight={wantedMeeting}
                  onOpen={item => {
                    setMid(item.id)
                    setView("meeting")
                    setToast(null)
                  }}
                  onArchive={() => setView("archive")}
                  onCalendar={() => setMode("cal")}
                  onEvenings={() => {
                    fill(openSlots.filter(slot => slot.part.key === "evening").map(slot => slot.id))
                    setMode("cal")
                  }}
                />
              )}
            </>
          ) : null}

          {!block && view === "profile" ? (
            <Profile
              paused={plan.paused}
              onToggle={() => {
                haptic.select()
                keep({ ...plan, paused: !plan.paused })
              }}
            />
          ) : null}

          {!block && view === "meeting" && meeting ? (
            <Meeting
              meeting={meeting}
              past={pastSlots.has(meeting.slot)}
              onBack={back}
              onDecline={() => void answer(false, false)}
              onExit={() => setPopup(true)}
            />
          ) : null}

          {!block && view === "archive" ? (
            <Archive
              rows={archive}
              onOpen={id => {
                setMid(id)
                setView("meeting")
              }}
            />
          ) : null}
        </div>

        {!block && (view === "meetings" || view === "profile") ? (
          <div className="tabbar">
            <button
              type="button"
              className={view === "meetings" ? "on" : ""}
              onClick={() => setView("meetings")}
            >
              <span className="pill">
                <Icon name="calendar_month" fill={view === "meetings"} />
              </span>
              <span className="lab">{copy.tabs.meetings}</span>
            </button>
            <button
              type="button"
              className={view === "profile" ? "on" : ""}
              onClick={() => setView("profile")}
            >
              <span className="pill">
                <Icon name="person" fill={view === "profile"} />
              </span>
              <span className="lab">{copy.tabs.profile}</span>
            </button>
          </div>
        ) : null}

        {toast ? (
          <Toast
            text={toast.text}
            action={toast.action}
            onAction={() => {
              setToast(null)
              if (toast.action) void load()
            }}
          />
        ) : null}

        {pick ? (
          <CellSheet
            title={pick.title}
            catalog={catalog}
            draft={draft}
            dirty={!same(draft, pick.start)}
            onToggle={key => setDraft(current => toggle(current, key))}
            onSelectAll={setDraft}
            onRemove={() => closePick("remove")}
            onSave={() => closePick("save")}
            onClose={() => setPick(null)}
          />
        ) : null}
      </div>

      {button ? <MainButton {...button} scheme={scheme} /> : null}

      {popup && meeting ? (
        <Sheet onClose={() => setPopup(false)}>
          {close => (
            <>
              <div className="title">{copy.meet.exitAsk}</div>

              <div className="sheet-acts">
                <button type="button" className="btn outline" onClick={() => close()}>
                  {copy.meet.stay}
                </button>
                <button
                  type="button"
                  className="btn outline danger"
                  onClick={() => close(() => void answer(false, true))}
                >
                  {copy.meet.leaveConfirm}
                </button>
              </div>
            </>
          )}
        </Sheet>
      ) : null}
    </div>
  )
}
