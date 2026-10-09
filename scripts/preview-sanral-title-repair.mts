/**
 * DRY RUN ONLY — previews how live SANRAL records would change if their titles,
 * descriptions, source links and deadlines were rebuilt from SANRAL's detail
 * pages. Nothing is written to the database: this script only SELECTs.
 *
 * Usage: npx tsx scripts/preview-sanral-title-repair.mts [output-dir]
 * (default output-dir: output/tender-repairs, which is gitignored)
 *
 * Writes:
 *   repair-sanral.json          verified repairs, in the format apply-tender-repairs.mts reads
 *   sanral-repair-preview.json  every live record with its verification status
 *   sanral-repair-preview.md    before/after table
 */
import fs from "node:fs"
import path from "node:path"
import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"
import { parseSanralDetail, parseSanralListing } from "../src/lib/collectors/sanralParser"
import { formatSouthAfricaIso } from "../src/lib/southAfricaTime"
import { resolveTenderDisplayTitle } from "../src/lib/tenderDisplayTitle"

nextEnv.loadEnvConfig(process.cwd())

const ORIGIN = "https://www.nra.co.za"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
const outputDir = process.argv[2] ?? path.join("output", "tender-repairs")

type Row = {
  id: number
  external_ocid: string | null
  external_reference: string | null
  title: string | null
  description: string | null
  closing_date: string | null
  published_date: string | null
  original_source_url: string | null
}

async function fetchHtml(url: string): Promise<string | null> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  return response.ok ? response.text() : null
}

function guessSlug(reference: string): string {
  return reference.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

/** "2026-10-22T10:00:00.000Z (2026-10-22T12:00:00+02:00)" */
function bothZones(value: string | Date | null): string | null {
  if (!value) return null
  const instant = new Date(value)
  return `${instant.toISOString()} (${formatSouthAfricaIso(instant)})`
}

const sastDay = (value: Date | string | null) => (value ? formatSouthAfricaIso(new Date(value)).slice(0, 10) : null)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
const { data, error } = await supabase
  .from("rfqs")
  .select("id, external_ocid, external_reference, title, description, closing_date, published_date, original_source_url")
  .eq("source_name", "SANRAL")
  .eq("is_public", true)
  .in("status", ["open", "active"])
  .gt("closing_date", new Date().toISOString())
  .order("id")
if (error) throw error
const rows = (data ?? []) as Row[]

const listingHtml = await fetchHtml(`${ORIGIN}/sanral-tenders/list/open-tenders`)
const listingUrls = new Map(
  (listingHtml ? parseSanralListing(listingHtml, ORIGIN) : []).map((row) => [row.reference, row.detailUrl]),
)

async function previewRow(row: Row) {
  const reference = (row.external_reference || row.external_ocid || "").trim()
  const detailUrl = listingUrls.get(reference) ?? `${ORIGIN}/sanral-tenders/detail/${guessSlug(reference)}`
  const html = reference ? await fetchHtml(detailUrl) : null
  const detail = html ? parseSanralDetail(html, reference) : null

  const referenceMatches = detail?.tenderNumber === reference
  // The stored time is wrong (see report), so only the calendar day is compared.
  const closingDayMatches = Boolean(detail?.closingDate) && sastDay(detail!.closingDate) === sastDay(row.closing_date)

  const status = !html
    ? "unresolved: detail page not found"
    : !referenceMatches
      ? `unresolved: page reference "${detail?.tenderNumber}" differs`
      : !closingDayMatches
        ? `unresolved: page closes ${bothZones(detail!.closingDate)}, stored ${bothZones(row.closing_date)}`
        : !detail!.officialTitle
          ? "unresolved: page has no heading"
          : detail!.hasAwardResult
            ? `unresolved: award result published (Awarded To: ${detail!.awardFields["Awarded To"]})`
            : "verified"

  const proposed = status === "verified"
    ? {
        title: detail!.officialTitle,
        description: detail!.scope,
        closing_date: detail!.closingDate!.toISOString(),
        original_source_url: detailUrl,
        published_date: detail!.createdDate?.toISOString() ?? row.published_date,
      }
    : null

  return {
    id: row.id,
    source_name: "SANRAL",
    reference,
    source_url: detailUrl,
    url_found_via: listingUrls.has(reference) ? "listing link" : "slug derived from reference",
    status,
    evidence: detail?.officialTitle ? `Page heading: "${detail.officialTitle}"; page closing: ${bothZones(detail.closingDate)}` : null,
    before: {
      title: row.title,
      description: row.description,
      closing_date: row.closing_date,
      original_source_url: row.original_source_url,
      published_date: row.published_date,
    },
    proposed,
    display_title: proposed
      ? resolveTenderDisplayTitle({ title: proposed.title, description: proposed.description, reference, sourceName: "SANRAL" }).displayTitle
      : null,
  }
}

const results: Awaited<ReturnType<typeof previewRow>>[] = []
for (const row of rows) results.push(await previewRow(row))
const verified = results.filter((r) => r.status === "verified")

fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(
  path.join(outputDir, "repair-sanral.json"),
  JSON.stringify(verified.map(({ id, source_name, reference, source_url, evidence, before, proposed }) => ({ id, source_name, reference, source_url, evidence, before, proposed })), null, 2),
)
fs.writeFileSync(path.join(outputDir, "sanral-repair-preview.json"), JSON.stringify(results, null, 2))

const cell = (value: unknown) => String(value ?? "—").replace(/\|/g, "\\|").replace(/\s+/g, " ")
const markdown = [
  "| id | reference | status | stored title (before) | official heading (proposed title) | display title | source URL | closing: stored → source |",
  "|---|---|---|---|---|---|---|---|",
  ...results.map((r) =>
    `| ${r.id} | ${cell(r.reference)} | ${cell(r.status)} | ${cell(r.before.title)} | ${cell(r.proposed?.title)} | ${cell(r.display_title)} | ${cell(r.source_url)} | ${cell(bothZones(r.before.closing_date))} → ${cell(bothZones(r.proposed?.closing_date ?? null))} |`,
  ),
].join("\n")
fs.writeFileSync(path.join(outputDir, "sanral-repair-preview.md"), markdown)

console.log(`DRY RUN — no database writes. Records: ${results.length}; verified: ${verified.length}; unresolved: ${results.length - verified.length}`)
for (const r of results.filter((x) => x.status !== "verified")) console.log(`  ${r.id} ${r.reference}: ${r.status}`)
const shifts = new Map<string, number>()
for (const r of verified) {
  const hours = (new Date(r.before.closing_date!).getTime() - new Date(r.proposed!.closing_date).getTime()) / 3_600_000
  shifts.set(`${hours}h`, (shifts.get(`${hours}h`) ?? 0) + 1)
}
console.log(`Stored closing minus source closing: ${[...shifts].map(([k, v]) => `${k} × ${v}`).join(", ")}`)
console.log(`Wrote ${outputDir}/repair-sanral.json, sanral-repair-preview.json, sanral-repair-preview.md`)
