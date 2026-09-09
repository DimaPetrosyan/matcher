import type { Bot } from "grammy"
import {
  findUserByTgId,
  listActiveInterests,
  loadProfile,
  saveArea,
  saveInterests,
  saveSlots,
  type InterestKeyValue,
} from "../database/index.mts"
import {
  byLabel,
  districts,
  interestTextKey,
  isDistrictKey,
  isInterestKey,
  isRadiusKey,
  isSlotKey,
  radii,
  slotByKey,
  slotKeysOf,
  slots,
  steps,
  suggestionLimit,
  suggestionMaxLength,
  type InterestKey,
} from "../bot/index.mts"
import { resolveLocale, translatorFor } from "../i18n/index.mts"
import { env } from "../env.mts"
import { cachedAccess } from "./access.mts"
import { checkInitData } from "./initData.mts"

export type Session = { userId: string; tgId: number; languageCode?: string }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  })

const readInitData = (request: Request) => {
  const header = request.headers.get("authorization") ?? ""
  return header.startsWith("tma ") ? header.slice(4) : ""
}

export const authorize = async (
  bot: Bot,
  request: Request,
): Promise<{ session: Session } | { error: Response }> => {
  const raw = readInitData(request)
  if (!raw) return { error: json({ error: "unauthorized" }, 401) }

  const check = checkInitData(raw, env.botToken)
  if (!check.ok) {
    console.warn(`init data rejected: ${check.reason}`)
    return { error: json({ error: "unauthorized" }, 401) }
  }

  const access = await cachedAccess(bot, check.user.tgId)

  if (access.kind !== "allowed") {
    return {
      error: json(
        {
          error: "forbidden",
          kind: access.kind,
          community: access.kind === "lost" ? access.community : undefined,
        },
        access.kind === "unverifiable" ? 503 : 403,
      ),
    }
  }

  const user = await findUserByTgId(check.user.tgId)
  if (!user) return { error: json({ error: "notRegistered" }, 403) }

  return {
    session: { userId: user.id, tgId: check.user.tgId, languageCode: check.user.languageCode },
  }
}

const catalogFor = async (languageCode?: string) => {
  const t = translatorFor(languageCode)
  const locale = resolveLocale(languageCode)

  const active = (await listActiveInterests()).map(row => row.key).filter(isInterestKey)

  return {
    interests: [...active].sort(byLabel(t, locale)).map(key => ({
      key,
      label: t(interestTextKey[key]),
    })),
    slots: slots.map(slot => ({
      key: slot.key,
      label: t(slot.textKey),
      group: slot.group,
      startTime: slot.startTime,
      endTime: slot.endTime,
    })),
    districts: districts.map(item => ({ key: item.key, label: t(item.textKey) })),
    radii: radii.map(item => ({
      key: item.key,
      label: t(item.textKey),
      sub: t(item.subTextKey),
    })),
  }
}

export const getProfile = async (session: Session) => {
  const [profile, catalog] = await Promise.all([
    loadProfile(session.userId),
    catalogFor(session.languageCode),
  ])

  return json({
    step: profile.onboardingStep,
    status: profile.status,
    catalog,
    selected: {
      interests: profile.interests,
      slots: slotKeysOf(profile.slots),
      district: profile.district,
      radius: profile.travelRadius,
    },
    suggestions: profile.suggestions,
    limits: { suggestionLimit, suggestionMaxLength },
  })
}

const body = async (request: Request): Promise<Record<string, unknown> | null> => {
  try {
    const parsed = await request.json()
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

export const putInterests = async (session: Session, request: Request) => {
  const payload = await body(request)
  if (!payload) return json({ error: "badRequest" }, 400)

  const keys = stringList(payload.keys).filter(isInterestKey)
  if (keys.length === 0) return json({ error: "emptySelection" }, 400)

  const suggestions = [...new Set(stringList(payload.suggestions).map(item => item.trim()))].filter(
    item => item.length > 0,
  )

  if (suggestions.length > suggestionLimit) return json({ error: "atLimit" }, 400)
  if (suggestions.some(item => item.length > suggestionMaxLength)) {
    return json({ error: "tooLong" }, 400)
  }

  await saveInterests(session.userId, keys as InterestKeyValue[], suggestions, steps.availability)

  return getProfile(session)
}

export const putAvailability = async (session: Session, request: Request) => {
  const payload = await body(request)
  if (!payload) return json({ error: "badRequest" }, 400)

  const keys = stringList(payload.slots).filter(isSlotKey)
  if (keys.length === 0) return json({ error: "emptySelection" }, 400)

  const chosen = keys.map(key => {
    const { recurrence, startTime, endTime } = slotByKey(key)
    return { recurrence, startTime, endTime }
  })

  await saveSlots(session.userId, chosen, steps.area)

  return getProfile(session)
}

export const putArea = async (session: Session, request: Request) => {
  const payload = await body(request)
  if (!payload) return json({ error: "badRequest" }, 400)

  const district = typeof payload.district === "string" ? payload.district : ""
  const radius = typeof payload.radius === "string" ? payload.radius : ""

  if (!isDistrictKey(district) || !isRadiusKey(radius)) return json({ error: "badRequest" }, 400)

  await saveArea(session.userId, district, radius, steps.done)

  return getProfile(session)
}

export type Route = {
  method: string
  path: string
  handle: (session: Session, request: Request) => Promise<Response>
}

export const routes: Route[] = [
  { method: "GET", path: "/api/profile", handle: session => getProfile(session) },
  { method: "PUT", path: "/api/interests", handle: putInterests },
  { method: "PUT", path: "/api/availability", handle: putAvailability },
  { method: "PUT", path: "/api/area", handle: putArea },
]

export const notFound = () => json({ error: "notFound" }, 404)

export type InterestKeyExport = InterestKey
