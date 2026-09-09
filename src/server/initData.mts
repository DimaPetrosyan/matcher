import { createHmac, timingSafeEqual } from "node:crypto"

export const maxInitDataAgeSeconds = 300

export type MiniAppUser = {
  tgId: number
  username?: string
  firstName?: string
  languageCode?: string
}

export type InitDataFailure = "noHash" | "badHash" | "expired" | "noUser" | "malformed"

export type InitDataResult =
  { ok: true; user: MiniAppUser; authDate: Date } | { ok: false; reason: InitDataFailure }

const secretKeyFor = (token: string) => createHmac("sha256", "WebAppData").update(token).digest()

const dataCheckString = (params: URLSearchParams) =>
  [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

export const signInitData = (params: URLSearchParams, token: string) =>
  createHmac("sha256", secretKeyFor(token)).update(dataCheckString(params)).digest("hex")

export const checkInitData = (
  raw: string,
  token: string,
  opts: { now?: number; maxAgeSeconds?: number } = {},
): InitDataResult => {
  const now = opts.now ?? Date.now()
  const maxAge = opts.maxAgeSeconds ?? maxInitDataAgeSeconds

  const params = new URLSearchParams(raw)

  const hash = params.get("hash")
  if (!hash) return { ok: false, reason: "noHash" }

  const expected = Buffer.from(signInitData(params, token), "hex")
  const given = Buffer.from(hash, "hex")

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "badHash" }
  }

  const authDate = Number(params.get("auth_date"))
  if (!Number.isFinite(authDate) || authDate <= 0) return { ok: false, reason: "malformed" }
  if (now / 1000 - authDate > maxAge) return { ok: false, reason: "expired" }

  const rawUser = params.get("user")
  if (!rawUser) return { ok: false, reason: "noUser" }

  let parsed: { id?: unknown; username?: unknown; first_name?: unknown; language_code?: unknown }

  try {
    parsed = JSON.parse(rawUser)
  } catch {
    return { ok: false, reason: "noUser" }
  }

  if (typeof parsed.id !== "number" || !Number.isFinite(parsed.id)) {
    return { ok: false, reason: "noUser" }
  }

  return {
    ok: true,
    authDate: new Date(authDate * 1000),
    user: {
      tgId: parsed.id,
      username: typeof parsed.username === "string" ? parsed.username : undefined,
      firstName: typeof parsed.first_name === "string" ? parsed.first_name : undefined,
      languageCode: typeof parsed.language_code === "string" ? parsed.language_code : undefined,
    },
  }
}
