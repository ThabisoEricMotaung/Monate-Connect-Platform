/**
 * Applies verified tender repairs produced by the preview scripts
 * (output/tender-repairs/repair-*.json). DRY RUN BY DEFAULT.
 *
 *   npx tsx scripts/apply-tender-repairs.mts [--files a.json,b.json]            # dry run
 *   npx tsx scripts/apply-tender-repairs.mts [--files ...] --apply              # writes
 *   npx tsx scripts/apply-tender-repairs.mts --rollback <rollback.json>         # dry run of a rollback
 *   npx tsx scripts/apply-tender-repairs.mts --rollback <rollback.json> --apply # restores
 *
 * Safeguards:
 * - Only the record IDs listed in the repair files are touched; EXCLUDED_IDS never are.
 * - Only REPAIRABLE_FIELDS may change. IDs, references (external_reference,
 *   external_ocid) and every other column are never written.
 * - Snapshot check, twice: records whose current values differ from the
 *   preview's "before" snapshot are skipped in planning, AND every UPDATE is
 *   conditional on those same values (WHERE id = … AND field = before …), so a
 *   record edited between planning and writing is not overwritten.
 * - Before any write the previous values are saved to a rollback file; after
 *   the run it is rewritten to list only the records actually written.
 * - Rollback restores a record only while it still holds exactly the repaired
 *   values (conditional UPDATE), so later edits are never overwritten.
 * - Every record's outcome is written to a result file; any record not
 *   written (changed concurrently or failed) makes the exit code non-zero.
 */
import fs from "node:fs"
import path from "node:path"
import nextEnv from "@next/env"
import { createClient } from "@supabase/supabase-js"

nextEnv.loadEnvConfig(process.cwd())

const EXPECTED_PRODUCTION_PROJECT_REF = "enoyrbdflwihxzitpour"
const REPAIR_DIR = path.join("output", "tender-repairs")
const REPAIRABLE_FIELDS = ["title", "description", "closing_date", "original_source_url", "published_date"] as const
const TIMESTAMP_FIELDS = new Set<string>(["closing_date", "published_date"])
// 5663 (SANRAL NRA 2026/0021 (B)): the page found for its reference closes on a
// different date than the stored record, so it was not verified.
const EXCLUDED_IDS = new Set([5663])

type Field = (typeof REPAIRABLE_FIELDS)[number]
type Values = Partial<Record<Field, string | null>>
type RepairEntry = { id: number; source_name: string; reference: string; source_url: string; before: Values; proposed: Record<string, string | null> }
type RollbackEntry = { id: number; source_name: string; previous: Values; applied: Values }
type Plan = { id: number; label: string; values: Values; expected: Values }
type Outcome = { id: number; label: string; outcome: "written" | "changed-since-check" | "failed"; detail?: string }

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const argValue = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const rollbackFile = argValue("--rollback")
const runStamp = new Date().toISOString().replace(/[:.]/g, "-")

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
if (projectRef !== EXPECTED_PRODUCTION_PROJECT_REF) {
  throw new Error(`Refusing to run against project ${projectRef}; expected ${EXPECTED_PRODUCTION_PROJECT_REF}`)
}
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

function sameValue(field: string, a: string | null | undefined, b: string | null | undefined): boolean {
  if ((a ?? null) === null || (b ?? null) === null) return (a ?? null) === (b ?? null)
  if (TIMESTAMP_FIELDS.has(field)) return new Date(a!).getTime() === new Date(b!).getTime()
  return a === b
}

async function loadCurrent(ids: number[]) {
  const { data, error } = await admin
    .from("rfqs")
    .select(`id, source_name, ${REPAIRABLE_FIELDS.join(", ")}`)
    .in("id", ids)
  if (error) throw error
  return new Map(((data ?? []) as unknown as Array<Record<string, string | null> & { id: number }>).map((row) => [row.id, row]))
}

/** Fields of `current` that differ from `expected`. */
function mismatches(current: Record<string, string | null>, expected: Values): string[] {
  return Object.keys(expected).filter((field) => !sameValue(field, current[field], expected[field as Field]))
}

/** Adds "id = … AND field = expected …" filters (timestamps compare as instants in Postgres; text exactly). */
type Filterable = { eq(column: string, value: unknown): Filterable; is(column: string, value: null): Filterable }

function whereUnchanged<Q>(query: Q, plan: Plan): Q {
  // Structural view of the Supabase filter builder (its own types recurse too deeply here).
  let filtered = (query as unknown as Filterable).eq("id", plan.id)
  for (const [field, value] of Object.entries(plan.expected)) {
    filtered = value === null || value === undefined ? filtered.is(field, null) : filtered.eq(field, value)
  }
  return filtered as unknown as Q
}

/** Read-only check that each plan's write condition matches its row now (run in dry runs). */
async function verifyConditions(plans: Plan[]): Promise<void> {
  const failing: number[] = []
  for (const plan of plans) {
    const { data, error } = await whereUnchanged(admin.from("rfqs").select("id"), plan)
    if (error || data?.length !== 1) failing.push(plan.id)
  }
  console.log(`Write conditions checked read-only: ${plans.length - failing.length} of ${plans.length} match their record${failing.length ? `; NOT matching: ${failing.join(", ")}` : ""}.`)
  if (failing.length) process.exitCode = 1
}

/**
 * Writes each plan with an UPDATE that only matches while the record still
 * holds `expected` (compare-and-set), and records every outcome.
 */
async function writeConditionally(plans: Plan[]): Promise<Outcome[]> {
  const outcomes: Outcome[] = []
  for (const plan of plans) {
    const { data, error } = await whereUnchanged(admin.from("rfqs").update(plan.values), plan).select("id")
    if (error) outcomes.push({ id: plan.id, label: plan.label, outcome: "failed", detail: error.message })
    else if ((data?.length ?? 0) === 1) outcomes.push({ id: plan.id, label: plan.label, outcome: "written" })
    else outcomes.push({ id: plan.id, label: plan.label, outcome: "changed-since-check", detail: "no row matched the expected values; left untouched" })
  }
  return outcomes
}

function report(kind: string, outcomes: Outcome[]): void {
  const count = (outcome: Outcome["outcome"]) => outcomes.filter((o) => o.outcome === outcome).length
  // Named "result-…" so it never matches the repair-*.json inputs.
  const resultPath = path.join(REPAIR_DIR, `result-${kind}-${runStamp}.json`)
  fs.writeFileSync(resultPath, JSON.stringify(outcomes, null, 2))
  console.log(`${kind}: ${count("written")} written, ${count("changed-since-check")} changed since check (not written), ${count("failed")} failed — of ${outcomes.length}.`)
  for (const o of outcomes.filter((x) => x.outcome !== "written")) console.log(`  NOT WRITTEN ${o.id} ${o.label}: ${o.outcome}${o.detail ? ` (${o.detail})` : ""}`)
  console.log(`Per-record outcomes: ${resultPath}`)
  if (outcomes.some((o) => o.outcome !== "written")) process.exitCode = 1
}

async function rollback(file: string) {
  const entries = JSON.parse(fs.readFileSync(file, "utf8")) as RollbackEntry[]
  const current = await loadCurrent(entries.map((entry) => entry.id))
  const plans: Plan[] = []
  for (const entry of entries) {
    const row = current.get(entry.id)
    const changed = row ? mismatches(row, entry.applied) : ["(record missing)"]
    if (changed.length) {
      console.log(`  skip ${entry.id}: changed after the repair (${changed.join(", ")}); not restored`)
      continue
    }
    plans.push({ id: entry.id, label: entry.source_name, values: entry.previous, expected: entry.applied })
  }
  console.log(`${apply ? "APPLY" : "DRY RUN"} rollback from ${file}: ${plans.length} of ${entries.length} records restorable.`)
  if (!apply) {
    await verifyConditions(plans)
    console.log("Dry run only. Re-run with --apply to restore.")
    return
  }
  report("rollback", await writeConditionally(plans))
}

async function repair() {
  const files = argValue("--files")?.split(",") ??
    fs.readdirSync(REPAIR_DIR).filter((name) => /^repair-.+\.json$/.test(name)).map((name) => path.join(REPAIR_DIR, name))
  const entries = files.flatMap((file) => JSON.parse(fs.readFileSync(file, "utf8")) as RepairEntry[])

  const seen = new Set<number>()
  const valid: RepairEntry[] = []
  for (const entry of entries) {
    const extraFields = Object.keys(entry.proposed).filter((field) => !(REPAIRABLE_FIELDS as readonly string[]).includes(field))
    if (EXCLUDED_IDS.has(entry.id)) console.log(`  skip ${entry.id}: excluded`)
    else if (seen.has(entry.id)) console.log(`  skip ${entry.id}: listed twice`)
    else if (extraFields.length) console.log(`  skip ${entry.id}: proposes non-repairable fields (${extraFields.join(", ")})`)
    else if (Object.keys(entry.proposed).length === 0) console.log(`  skip ${entry.id}: nothing proposed`)
    else valid.push(entry)
    seen.add(entry.id)
  }

  const current = await loadCurrent(valid.map((entry) => entry.id))
  const plans: Array<Plan & { rollback: RollbackEntry }> = []
  for (const entry of valid) {
    const row = current.get(entry.id)
    if (!row) {
      console.log(`  skip ${entry.id}: record not found`)
      continue
    }
    if (row.source_name !== entry.source_name) {
      console.log(`  skip ${entry.id}: source is ${row.source_name}, repair is for ${entry.source_name}`)
      continue
    }
    const changed = mismatches(row, entry.before)
    if (changed.length) {
      console.log(`  skip ${entry.id}: changed since the preview (${changed.join(", ")})`)
      continue
    }
    const applied: Values = {}
    const previous: Values = {}
    for (const field of Object.keys(entry.proposed) as Field[]) {
      if (sameValue(field, row[field], entry.proposed[field])) continue
      applied[field] = entry.proposed[field]
      previous[field] = row[field]
    }
    if (!Object.keys(applied).length) continue
    plans.push({
      id: entry.id,
      label: `${entry.source_name} ${entry.reference}`,
      values: applied,
      expected: entry.before,
      rollback: { id: entry.id, source_name: entry.source_name, previous, applied },
    })
  }

  const bySource = new Map<string, number>()
  for (const plan of plans) bySource.set(plan.rollback.source_name, (bySource.get(plan.rollback.source_name) ?? 0) + 1)
  console.log(`${apply ? "APPLY" : "DRY RUN"} — project ${projectRef}. Files: ${files.join(", ")}`)
  console.log(`Records to update: ${plans.length} (${[...bySource].map(([source, count]) => `${source} ${count}`).join(", ") || "none"}) of ${entries.length} listed.`)
  for (const plan of plans) console.log(`  ${plan.id} ${plan.label}: ${Object.keys(plan.values).join(", ")}`)

  if (!apply) {
    await verifyConditions(plans)
    console.log("Dry run only. Re-run with --apply to write.")
    return
  }

  // Saved before writing; rewritten afterwards to list only the records written.
  const rollbackPath = path.join(REPAIR_DIR, `rollback-${runStamp}.json`)
  fs.writeFileSync(rollbackPath, JSON.stringify(plans.map((plan) => plan.rollback), null, 2))
  console.log(`Saved previous values to ${rollbackPath}`)

  const outcomes = await writeConditionally(plans)
  const written = new Set(outcomes.filter((o) => o.outcome === "written").map((o) => o.id))
  fs.writeFileSync(rollbackPath, JSON.stringify(plans.filter((plan) => written.has(plan.id)).map((plan) => plan.rollback), null, 2))
  console.log(`Rollback file now lists the ${written.size} records written: ${rollbackPath}`)
  report("repair", outcomes)
}

if (rollbackFile) await rollback(rollbackFile)
else await repair()
