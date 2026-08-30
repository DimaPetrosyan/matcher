import { describe, expect, it } from "bun:test"
import { buildDeepLink, parseStartPayload } from "../src/bot/deeplink.mts"

describe("parseStartPayload", () => {
  it("пустой payload — прямой заход", () => {
    expect(parseStartPayload(undefined)).toEqual({ kind: "direct" })
    expect(parseStartPayload("   ")).toEqual({ kind: "direct" })
  })

  it("ссылка из чата — восстанавливает его id", () => {
    expect(parseStartPayload("c-5488514678")).toEqual({ kind: "chat", tgChatId: -5488514678 })
  })

  it("кириллица и пробелы — недоверенный ввод, а не чат", () => {
    expect(parseStartPayload("c-ерунда").kind).toBe("unknown")
    expect(parseStartPayload("drop table").kind).toBe("unknown")
  })

  it("длиннее 64 символов — unknown, и raw обрезается", () => {
    const result = parseStartPayload("a".repeat(100))
    expect(result.kind).toBe("unknown")
    expect(result.kind === "unknown" && result.raw.length).toBe(64)
  })

  it("валидный payload не того формата — unknown", () => {
    expect(parseStartPayload("i-abc123").kind).toBe("unknown")
    expect(parseStartPayload("c-nashi").kind).toBe("unknown")
  })

  it("собирает ссылку из id чата, и она разбирается обратно", () => {
    expect(buildDeepLink("nashbot", -5488514678)).toBe("https://t.me/nashbot?start=c-5488514678")
    expect(parseStartPayload("5488514678")).toEqual({ kind: "unknown", raw: "5488514678" })
  })
})
