import { describe, expect, it } from "bun:test"
import { furthestStep } from "../src/database/profile.mts"

describe("шаг онбординга", () => {
  it("двигается только вперёд", () => {
    expect(furthestStep("interests", "availability")).toBe("availability")
    expect(furthestStep("availability", "area")).toBe("area")
    expect(furthestStep("area", "done")).toBe("done")
  })

  it("не откатывается, когда правят пройденный шаг", () => {
    expect(furthestStep("done", "availability")).toBe("done")
    expect(furthestStep("done", "area")).toBe("done")
    expect(furthestStep("area", "availability")).toBe("area")
  })

  it("повторное сохранение того же шага ничего не меняет", () => {
    for (const step of ["interests", "availability", "area", "done"])
      expect(furthestStep(step, step)).toBe(step)
  })

  it("незнакомое значение считается началом, а не концом", () => {
    expect(furthestStep("что-то своё", "availability")).toBe("availability")
  })
})

describe("поток онбординга", () => {
  it("сейчас два шага: интересы и время, район скрыт", async () => {
    const { onboardingFlow } = await import("../src/bot/screens.mts")
    expect([...onboardingFlow]).toEqual(["interests", "availability"])
  })

  it("после последнего шага анкета считается заполненной", async () => {
    const { nextStepAfter } = await import("../src/bot/screens.mts")
    expect(nextStepAfter("interests")).toBe("availability")
    expect(nextStepAfter("availability")).toBe("done")
  })

  it("шаг вне потока не уводит в середину анкеты", async () => {
    const { nextStepAfter } = await import("../src/bot/screens.mts")
    expect(nextStepAfter("area")).toBe("done")
  })
})
