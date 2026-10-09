/**
 * READ-ONLY audit of listing titles for every live tender, grouped by source.
 * For each record it reports the heading listings show now, and the heading
 * they would show once the dry-run repairs in output/tender-repairs/repair-*.json
 * are applied, each judged by judgeTenderTitle (src/lib/tenderTitleQuality.ts).
 *
 * Usage: npx tsx scripts/audit-tender-titles.mts [output-dir]   (default output/tender-repairs)
 */
import fs from "node:fs"
import path from "node:path"
import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"
import { TENDER_LISTING_COLUMNS, toTenderListing, type TenderListingRecord } from "../src/lib/tenderListing"
import { judgeTenderTitle, type TitleVerdict } from "../src/lib/tenderTitleQuality"

nextEnv.loadEnvConfig(process.cwd())

const outputDir = process.argv[2] ?? path.join("output", "tender-repairs")
const APPLIED_FIELDS = ["title", "description"] as const

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
// Same filters as applyLivePublicOpportunityFilters (src/lib/opportunityStatsQuery.ts,
// which is server-only and can't be imported here).
const { data, error } = await supabase
  .from("rfqs")
  .select(TENDER_LISTING_COLUMNS)
  .eq("is_public", true)
  .in("status", ["open", "active"])
  .gt("closing_date", new Date().toISOString())
  .order("source_name")
  .order("id")
if (error) throw error
const records = (data ?? []) as TenderListingRecord[]

const repairs = new Map<number, Record<string, string | null>>()
if (fs.existsSync(outputDir)) {
  for (const name of fs.readdirSync(outputDir).filter((file) => /^repair-.+\.json$/.test(file))) {
    for (const entry of JSON.parse(fs.readFileSync(path.join(outputDir, name), "utf8")) as Array<{ id: number; proposed: Record<string, string | null> }>) {
      repairs.set(entry.id, entry.proposed)
    }
  }
}

const rows = records.map((record) => {
  const now = toTenderListing(record)
  const proposed = repairs.get(record.id)
  const repairedRecord = { ...record }
  for (const field of APPLIED_FIELDS) if (proposed && field in proposed) Object.assign(repairedRecord, { [field]: proposed[field] })
  const after = proposed ? toTenderListing(repairedRecord) : now
  return {
    source: record.source_name ?? "(none)",
    id: record.id,
    reference: now.reference_number,
    now: now.display_title,
    nowVerdict: judgeTenderTitle(now.display_title, now.reference_number),
    hasRepair: Boolean(proposed),
    after: after.display_title,
    afterVerdict: judgeTenderTitle(after.display_title, after.reference_number),
  }
})

const sources = [...new Set(rows.map((row) => row.source))]
const countBy = (list: typeof rows, key: "nowVerdict" | "afterVerdict") => {
  const counts = new Map<TitleVerdict, number>()
  for (const row of list) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1)
  return counts
}
const describe = (counts: Map<TitleVerdict, number>) =>
  [...counts].filter(([verdict]) => verdict !== "usable").map(([verdict, count]) => `${verdict} ${count}`).join(", ") || "—"

const cell = (value: unknown) => String(value ?? "—").replace(/\|/g, "\\|").replace(/\s+/g, " ")
const summary = [
  "| source | live | usable now | not usable now | with dry-run repair | usable after repair | still not usable |",
  "|---|---|---|---|---|---|---|",
  ...sources.map((source) => {
    const list = rows.filter((row) => row.source === source)
    const now = countBy(list, "nowVerdict")
    const after = countBy(list, "afterVerdict")
    return `| ${source} | ${list.length} | ${now.get("usable") ?? 0} | ${describe(now)} | ${list.filter((row) => row.hasRepair).length} | ${after.get("usable") ?? 0} | ${describe(after)} |`
  }),
  (() => {
    const now = countBy(rows, "nowVerdict")
    const after = countBy(rows, "afterVerdict")
    return `| **All sources** | ${rows.length} | ${now.get("usable") ?? 0} | ${describe(now)} | ${rows.filter((row) => row.hasRepair).length} | ${after.get("usable") ?? 0} | ${describe(after)} |`
  })(),
]
const detail = [
  "| source | id | reference | heading now | verdict now | heading after repair | verdict after |",
  "|---|---|---|---|---|---|---|",
  ...rows.map((row) =>
    `| ${cell(row.source)} | ${row.id} | ${cell(row.reference)} | ${cell(row.now)} | ${row.nowVerdict} | ${row.hasRepair ? cell(row.after) : "(no repair)"} | ${row.afterVerdict} |`,
  ),
]

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, "title-audit.md"), [`# Live tender title audit (${new Date().toISOString()})`, "", ...summary, "", ...detail].join("\n"))
fs.writeFileSync(path.join(outputDir, "title-audit.json"), JSON.stringify(rows, null, 2))
console.log(`READ-ONLY audit of ${rows.length} live records.`)
console.log(summary.join("\n"))
console.log(`Wrote ${path.join(outputDir, "title-audit.md")}`)
