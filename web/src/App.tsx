import { useCallback, useEffect, useRef, useState } from "react"
import { MainButton, type ButtonKind } from "./components/MainButton"
import { Toast } from "./components/Toast"
import { AccessState, LoadingState } from "./screens/AccessState"
import { Area } from "./screens/Area"
import { Availability } from "./screens/Availability"
import { Interests } from "./screens/Interests"
import { ProfileView } from "./screens/ProfileView"
import { ApiError, api } from "./api"
import { copy } from "./copy"
import { applyScheme, haptic, tg } from "./telegram"
import type { AccessProblem, FlowStep, Profile, Scheme } from "./types"

type Screen = FlowStep | "profile"

const toggle = (list: string[], key: string) =>
  list.includes(key) ? list.filter(item => item !== key) : [...list, key]

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every(item => b.includes(item))

const screenOf = (profile: Profile): Screen =>
  profile.step !== "done" && profile.flow.includes(profile.step) ? profile.step : "profile"

const rankOf = (profile: Profile, step: string) =>
  step === "done" ? profile.flow.length : profile.flow.indexOf(step as FlowStep)

export const App = () => {
  const [scheme, setScheme] = useState<Scheme>(tg?.colorScheme ?? "light")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [problem, setProblem] = useState<AccessProblem | null>(null)
  const [screen, setScreen] = useState<Screen>("interests")
  const [interests, setInterests] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [slots, setSlots] = useState<string[]>([])
  const [district, setDistrict] = useState<string | null>(null)
  const [radius, setRadius] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const retry = useRef<(() => void) | null>(null)

  const adopt = useCallback((next: Profile, moveTo?: Screen) => {
    setProfile(next)
    setInterests(next.selected.interests)
    setSuggestions(next.suggestions)
    setSlots(next.selected.slots)
    setDistrict(next.selected.district)
    setRadius(next.selected.radius)
    if (moveTo) setScreen(moveTo)
  }, [])

  const load = useCallback(async () => {
    setProblem(null)

    try {
      const next = await api.profile()
      adopt(next, screenOf(next))
    } catch (error) {
      if (error instanceof ApiError) setProblem(error.problem)
      else setProblem({ kind: "offline" })
    }
  }, [adopt])

  useEffect(() => {
    tg?.ready()
    tg?.expand()
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

  const flow = profile?.flow ?? []
  const position = screen === "profile" ? -1 : flow.indexOf(screen)

  const back = useCallback(() => {
    setScreen(current => {
      if (current === "profile") return current
      const index = flow.indexOf(current)
      return index > 0 ? flow[index - 1]! : current
    })
  }, [flow])

  useEffect(() => {
    const app = tg
    if (!app) return

    if (problem || position <= 0) {
      app.BackButton.hide()
      return
    }

    app.BackButton.onClick(back)
    app.BackButton.show()

    return () => {
      app.BackButton.offClick(back)
      app.BackButton.hide()
    }
  }, [position, problem, back])

  const save = (run: () => Promise<Profile>, moveTo: Screen, unchanged: boolean) => {
    if (unchanged) {
      setScreen(moveTo)
      return
    }

    const attempt = async () => {
      setSaving(true)
      setFailed(false)

      try {
        adopt(await run(), moveTo)
        if (moveTo === "profile") haptic.done()
      } catch (error) {
        if (error instanceof ApiError && error.problem.kind !== "offline") {
          setProblem(error.problem)
        } else {
          haptic.failed()
          retry.current = attempt
          setFailed(true)
        }
      } finally {
        setSaving(false)
      }
    }

    void attempt()
  }

  if (problem) {
    const text =
      problem.kind === "lost" ? copy.access.lost(problem.community) : copy.access[problem.kind]

    const canRetry = problem.kind === "unverifiable" || problem.kind === "offline"

    return (
      <div className="app">
        <div className="content">
          <AccessState title={text.title} text={text.text} />
        </div>
        <MainButton
          label={canRetry ? copy.buttons.retry : copy.buttons.close}
          kind="active"
          scheme={scheme}
          onClick={() => (canRetry ? void load() : tg?.close())}
        />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="app">
        <div className="content">
          <LoadingState />
        </div>
        <MainButton label={copy.buttons.next} kind="loading" scheme={scheme} onClick={() => {}} />
      </div>
    )
  }

  const stepLabel = `${position + 1} / ${flow.length}`
  const isLast = position === flow.length - 1
  const nextScreen: Screen = isLast ? "profile" : flow[position + 1]!
  const passed = rankOf(profile, profile.step) > position

  const button: { label: string; kind: ButtonKind; onClick: () => void } = (() => {
    const label = isLast ? copy.buttons.done : copy.buttons.next
    const busy = saving ? "loading" : null

    switch (screen) {
      case "interests":
        return {
          label,
          kind: busy ?? (interests.length ? "active" : "disabled"),
          onClick: () =>
            save(
              () => api.saveInterests(interests, suggestions),
              nextScreen,
              passed &&
                sameSet(interests, profile.selected.interests) &&
                sameSet(suggestions, profile.suggestions),
            ),
        }

      case "availability":
        return {
          label,
          kind: busy ?? (slots.length ? "active" : "disabled"),
          onClick: () =>
            save(
              () => api.saveAvailability(slots),
              nextScreen,
              passed && sameSet(slots, profile.selected.slots),
            ),
        }

      case "area":
        return {
          label,
          kind: busy ?? (district && radius ? "active" : "disabled"),
          onClick: () =>
            save(
              () => api.saveArea(district!, radius!),
              nextScreen,
              passed &&
                district === profile.selected.district &&
                radius === profile.selected.radius,
            ),
        }

      case "profile":
        return { label: copy.buttons.close, kind: "secondary", onClick: () => tg?.close() }
    }
  })()

  return (
    <div className="app">
      <div className="content">
        {failed ? (
          <Toast
            title={copy.saveFailed.title}
            text={copy.saveFailed.text}
            action={copy.buttons.retry}
            onAction={() => retry.current?.()}
          />
        ) : null}

        {screen === "interests" ? (
          <Interests
            stepLabel={stepLabel}
            catalog={profile.catalog.interests}
            selected={interests}
            suggestions={suggestions}
            limits={profile.limits}
            onToggle={key => setInterests(current => toggle(current, key))}
            onAdd={body =>
              setSuggestions(current => (current.includes(body) ? current : [...current, body]))
            }
            onRemove={body => setSuggestions(current => current.filter(item => item !== body))}
          />
        ) : null}

        {screen === "availability" ? (
          <Availability
            stepLabel={stepLabel}
            catalog={profile.catalog.slots}
            selected={slots}
            onToggle={key => setSlots(current => toggle(current, key))}
          />
        ) : null}

        {screen === "area" ? (
          <Area
            stepLabel={stepLabel}
            districts={profile.catalog.districts}
            radii={profile.catalog.radii}
            district={district}
            radius={radius}
            onDistrict={setDistrict}
            onRadius={setRadius}
          />
        ) : null}

        {screen === "profile" ? (
          <ProfileView profile={profile} onEdit={() => setScreen(flow[0] ?? "interests")} />
        ) : null}
      </div>

      <MainButton {...button} scheme={scheme} />
    </div>
  )
}
