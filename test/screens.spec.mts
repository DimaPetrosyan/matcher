import { describe, expect, it } from "bun:test"
import { locales, translatorFor } from "../src/i18n/translate.mts"
import { actions, callbackLimit, pack, parse, renderWelcome } from "../src/bot/screens.mts"

describe("callback_data", () => {
  it("кодирование и разбор симметричны", () => {
    expect(parse(pack(actions.consent))).toEqual({ action: "go", args: [] })
    expect(parse(pack(actions.consent, "myasnitskaya"))).toEqual({
      action: "go",
      args: ["myasnitskaya"],
    })
  })

  it("бросает при превышении 64 байт, а не обрезает молча", () => {
    expect(() => pack("x", "я".repeat(40))).toThrow()
  })

  it("каждая кнопка приветственного экрана влезает в лимит на всех языках", () => {
    for (const t of locales.map(l => translatorFor(l)))
      for (const payload of [undefined, "c-5488514678", `c-${"9".repeat(19)}`]) {
        const { keyboard } = renderWelcome(t, {
          policyUrl: "https://example.com/privacy",
          communityTitle: "Наши на Мясницкой",
          payload,
        })

        for (const row of keyboard.inline_keyboard)
          for (const button of row)
            if ("callback_data" in button)
              expect(Buffer.byteLength(button.callback_data, "utf8")).toBeLessThanOrEqual(
                callbackLimit,
              )
      }
  })
})
