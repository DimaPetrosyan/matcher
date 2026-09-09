import { describe, expect, it } from "bun:test"
import { checkInitData, signInitData } from "../src/server/initData.mts"

const token = "1234567890:AAF-abcdefghijklmnopqrstuvwxyz012345"
const now = Date.UTC(2026, 8, 9, 12, 0, 0)
const authDate = Math.floor(now / 1000) - 30

const make = (
  overrides: Record<string, string> = {},
  opts: { token?: string; withHash?: boolean } = {},
) => {
  const params = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({
      id: 864810049,
      first_name: "Дима",
      username: "dima",
      language_code: "ru",
    }),
    ...overrides,
  })

  if (opts.withHash !== false) params.set("hash", signInitData(params, opts.token ?? token))

  return params.toString()
}

describe("проверка initData", () => {
  it("подписанные данные принимаются", () => {
    const result = checkInitData(make(), token, { now })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.user).toEqual({
        tgId: 864810049,
        username: "dima",
        firstName: "Дима",
        languageCode: "ru",
      })
    }
  })

  it("подпись чужим токеном не проходит", () => {
    const alien = checkInitData(make({}, { token: "9999999999:XX" }), token, { now })
    expect(alien).toEqual({ ok: false, reason: "badHash" })
  })

  it("подменённый user ломает подпись", () => {
    const raw = make()
    const params = new URLSearchParams(raw)
    params.set("user", JSON.stringify({ id: 111, first_name: "Чужой" }))

    expect(checkInitData(params.toString(), token, { now })).toEqual({
      ok: false,
      reason: "badHash",
    })
  })

  it("без hash отвергается", () => {
    expect(checkInitData(make({}, { withHash: false }), token, { now })).toEqual({
      ok: false,
      reason: "noHash",
    })
  })

  it("hash не из шестнадцатеричных символов не роняет проверку", () => {
    const params = new URLSearchParams(make())
    params.set("hash", "z".repeat(64))

    expect(checkInitData(params.toString(), token, { now })).toEqual({
      ok: false,
      reason: "badHash",
    })
  })

  it("окно свежести — ровно 300 секунд от auth_date", () => {
    const atLimit = checkInitData(make(), token, { now: now + 270_000 })
    expect(atLimit.ok).toBe(true)

    const overLimit = checkInitData(make(), token, { now: now + 271_000 })
    expect(overLimit).toEqual({ ok: false, reason: "expired" })
  })

  it("данные из будущего не считаются протухшими", () => {
    expect(checkInitData(make(), token, { now: now - 60_000 }).ok).toBe(true)
  })

  it("данные без user не принимаются: некого пускать", () => {
    const params = new URLSearchParams({ auth_date: String(authDate), query_id: "x" })
    params.set("hash", signInitData(params, token))

    expect(checkInitData(params.toString(), token, { now })).toEqual({
      ok: false,
      reason: "noUser",
    })
  })

  it("signature из Bot API 8.0 участвует в подписи, а не выбрасывается", () => {
    const raw = make({ signature: "3d8HcMv6VaDDvXYPUnnQ_yAZ0RRuLYuGmpMzYFAaJgU" })
    expect(checkInitData(raw, token, { now }).ok).toBe(true)

    const params = new URLSearchParams(raw)
    params.delete("signature")
    expect(checkInitData(params.toString(), token, { now })).toEqual({
      ok: false,
      reason: "badHash",
    })
  })

  it("порядок полей в строке запроса не влияет на результат", () => {
    const params = new URLSearchParams(make())
    const shuffled = new URLSearchParams()
    for (const key of [...params.keys()].reverse()) shuffled.set(key, params.get(key)!)

    expect(checkInitData(shuffled.toString(), token, { now }).ok).toBe(true)
  })
})
