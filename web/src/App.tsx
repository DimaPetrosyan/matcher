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
import type { AccessProblem, Profile, Scheme } from "./types"

type Screen = "interests" | "availability" | "area" | "profile"

const toggle = (list: string[], key: string) =>
  list.includes(key) ? list.filter(item => item !== key) : [...list, key]

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every(item => b.includes(item))

const screenOf = (profile: Profile): Screen =>
  profile.step === "done" ? "profile" : profile.step

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
  const retry = useRef<(() => void) | null>(null)
  const [failed, setFailed] = useState(false)

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

  const back = useCallback(() => {
    setScreen(current => (current === "area" ? "availability" : "interests"))
  }, [])

  useEffect(() => {
    const app = tg
    if (!app) return

    const showBack = !problem && (screen === "availability" || screen === "area")

    if (!showBack) {
      app.BackButton.hide()
      return
    }

    app.BackButton.onClick(back)
    app.BackButton.show()

    return () => {
      app.BackButton.offClick(back)
      app.BackButton.hide()
    }
  }, [screen, problem, back])

  const save = (run: () => Promise<Profile>, moveTo: Screen, unchanged = false) => {
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

  const button: { label: string; kind: ButtonKind; onClick: () => void } =
    screen === "interests"
      ? {
          label: copy.buttons.next,
          kind: saving ? "loading" : interests.length ? "active" : "disabled",
          onClick: () =>
            save(
              () => api.saveInterests(interests, suggestions),
              "availability",
              profile.step !== "interests" &&
                sameSet(interests, profile.selected.interests) &&
                sameSet(suggestions, profile.suggestions),
            ),
        }
      : screen === "availability"
        ? {
            label: copy.buttons.next,
            kind: saving ? "loading" : slots.length ? "active" : "disabled",
            onClick: () =>
              save(
                () => api.saveAvailability(slots),
                "area",
                (profile.step === "area" || profile.step === "done") &&
                  sameSet(slots, profile.selected.slots),
              ),
          }
        : screen === "area"
          ? {
              label: copy.buttons.done,
              kind: saving ? "loading" : district && radius ? "active" : "disabled",
              onClick: () =>
                save(
                  () => api.saveArea(district!, radius!),
                  "profile",
                  profile.step === "done" &&
                    district === profile.selected.district &&
                    radius === profile.selected.radius,
                ),
            }
          : {
              label: copy.buttons.close,
              kind: "secondary",
              onClick: () => tg?.close(),
            }

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
            catalog={profile.catalog.slots}
            selected={slots}
            onToggle={key => setSlots(current => toggle(current, key))}
          />
        ) : null}

        {screen === "area" ? (
          <Area
            districts={profile.catalog.districts}
            radii={profile.catalog.radii}
            district={district}
            radius={radius}
            onDistrict={setDistrict}
            onRadius={setRadius}
          />
        ) : null}

        {screen === "profile" ? (
          <ProfileView profile={profile} onEdit={() => setScreen("interests")} />
        ) : null}
      </div>

      <MainButton {...button} scheme={scheme} />
    </div>
  )
}
