import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".mts") ? [path] : []
  })

const importsOf = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(/^\s*import\s[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map(
    m => m[1]!,
  )

describe("границы", () => {
  it("слой данных не знает про Telegram", () => {
    for (const file of walk("src/database"))
      for (const spec of importsOf(file)) {
        expect(`${file} → ${spec}`).not.toContain("grammy")
        expect(`${file} → ${spec}`).not.toContain("/bot/")
      }
  })

  it("i18n ни от чего не зависит, кроме себя", () => {
    for (const file of walk("src/i18n"))
      for (const spec of importsOf(file))
        expect(`${file} → ${spec}`).toMatch(/^\S+ → \.\/[\w.]+\.mts$/)
  })

  it("внутри папки импортируют напрямую, а не через собственный барель", () => {
    for (const dir of ["src/database", "src/bot", "src/i18n"])
      for (const file of walk(dir))
        if (!file.endsWith("index.mts"))
          for (const spec of importsOf(file))
            expect(`${file} → ${spec}`).not.toContain("./index.mts")
  })

  it("тесты берут конкретный модуль, а не барель", () => {
    for (const file of walk("test"))
      for (const spec of importsOf(file))
        if (spec.includes("/src/")) expect(`${file} → ${spec}`).not.toContain("/index.mts")
  })
})
