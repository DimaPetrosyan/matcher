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
