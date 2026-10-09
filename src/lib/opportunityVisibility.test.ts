import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { excludeQuarantined } from "./opportunityVisibility"

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe("excludeQuarantined", () => {
  it("adds curation_status <> quarantined to the query", () => {
    const calls: unknown[][] = []
    const builder = { neq: (...args: unknown[]) => (calls.push(args), builder) }
    expect(excludeQuarantined(builder)).toBe(builder)
    expect(calls).toEqual([["curation_status", "quarantined"]])
  })
})

describe("public rfqs queries", () => {
  it("every is_public = true read also excludes quarantined records", () => {
    const offenders: string[] = []
    for (const file of sourceFiles(path.join(process.cwd(), "src"))) {
      const text = fs.readFileSync(file, "utf8")
      for (const match of text.matchAll(/\.eq\(\s*["']is_public["']\s*,\s*true\s*\)/g)) {
        // The exclusion must follow within the same query chain (or wrap it).
        const window = text.slice(Math.max(0, match.index! - 400), match.index! + 400)
        const excluded = /\.neq\(\s*["']curation_status["']\s*,\s*["']quarantined["']\s*\)/.test(window) || /excludeQuarantined\(/.test(window)
        if (!excluded) offenders.push(`${path.relative(process.cwd(), file)}:${text.slice(0, match.index).split("\n").length}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
