// Run from the project root: node scripts/debug-under-evaluation.mjs
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { createClient } from "@supabase/supabase-js"

async function main() {
  const env = parseEnv(readFileSync(new URL("../.env.local", import.meta.url), "utf8"))
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const now = new Date()
  const cutoff = now.toISOString()
  console.log(`Table: rfqs; credentials: .env.local anon key (no signed-in session)`)
  console.log(`Shared NOW cutoff: ${cutoff}`)
  console.log("This is the client clock captured once, not a database NOW() call. No SAST offset is added.")

  const filters = (query) => query
    .eq("is_public", true)
    .lte("closing_date", cutoff)
    .not("status", "in", "(awarded,closed)")
  const rowsQuery = () => filters(supabase.from("rfqs").select("id, title, closing_date, status"))
    .order("closing_date", { ascending: false })

  async function run(label, query, countOnly = false) {
    console.log(`\n--- ${label} ---`)
    try {
      const { data, count, error, status } = await query.abortSignal(AbortSignal.timeout(60000))
      const rows = data ?? []
      const total = error ? "unavailable" : countOnly ? (count ?? "unavailable") : rows.length
      console.log(`${label}: ${total} records`)
      console.log(`Total records returned in body: ${rows.length}; HTTP status: ${status}`)
      console.log("Errors:", error ?? "none")
      if (error) process.exitCode = 1
      if (countOnly) {
        console.log("First 3 records: unavailable (head: true returns no body; count is matching rows).")
      } else {
        console.log("First 3 records:")
        console.log(JSON.stringify(rows.slice(0, 3).map(({ id, title, status, closing_date }) =>
          ({ id, title, status, closing_date })), null, 2))
        const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/
        const checks = { strings: 0, dateObjects: 0, isoWithTimezone: 0, invalidDates: 0, afterCutoff: 0 }
        for (const row of rows) {
          const value = row.closing_date
          if (typeof value === "string") checks.strings++
          if (value instanceof Date) checks.dateObjects++
          if (typeof value === "string" && isoPattern.test(value)) checks.isoWithTimezone++
          const millis = typeof value === "string" ? Date.parse(value) : value instanceof Date ? value.getTime() : NaN
          if (!Number.isFinite(millis)) checks.invalidDates++
          else if (millis > now.getTime()) checks.afterCutoff++
        }
        console.log("closing_date checks (all returned rows):", checks)
        if (checks.invalidDates || checks.afterCutoff || checks.isoWithTimezone !== rows.length) {
          console.error("Date validation requires attention; inspect date formats and the live column type.")
          process.exitCode = 1
        }
      }
      return { rows: rows.length, count, error }
    } catch (error) {
      console.error(`${label}: unavailable records`)
      console.error("Total records returned: unavailable; first 3 records: unavailable")
      console.error("Errors:", error.message)
      process.exitCode = 1
      return { error }
    }
  }

  const a = await run("Query A (with limit 10000)", rowsQuery().limit(10000))
  const b = await run("Query B (no limit)", rowsQuery())
  const c = await run("Query C (count exact)", filters(supabase.from("rfqs").select("id", { count: "exact", head: true })), true)

  console.log("\n--- Comparison ---")
  if (a.error || b.error || c.error || c.count === null) {
    console.log("Cannot reliably compare all queries because a query failed or the exact count is missing.")
  } else {
    console.table({ A: { records: a.rows }, B: { records: b.rows }, C: { records: c.count } })
    if (a.rows === b.rows && a.rows < c.count && a.rows < 10000) {
      console.log(`A and B both stop at ${a.rows}, while C counts ${c.count}. This is consistent with a server-side API row cap; .limit(10000) does not override it.`)
    } else if (a.rows === c.count && b.rows === c.count) {
      console.log("All three totals agree: both data queries returned all matching rows visible to this anon client.")
    } else {
      console.log("Different totals can reflect server row limits, A's 10000-row limit, or data changes between these separate requests.")
    }
    console.log(`Rows not returned relative to exact count: A=${c.count - a.rows}, B=${c.count - b.rows}`)
  }
  console.log("Supabase defaults to a maximum of 1000 returned rows (project-configurable). Omitting .limit() does not mean unlimited rows.")
  console.log("Use the exact count for a metric; use paginated .range() requests when all record bodies are needed.")
  console.log("JSON timestamps arrive as strings, not Date objects. The rfqs migration declares TIMESTAMPTZ; PostgreSQL compares timestamp instants server-side against the ISO UTC cutoff.")
  console.log("The checks above parse returned timestamps to epoch milliseconds, avoiding lexical string comparisons. They do not verify the live schema or database clock skew.")
  console.log("SQL NOT IN excludes NULL statuses; closing_date <= cutoff also excludes NULL closing dates. All queries share these semantics and anon RLS visibility.")
  console.log("Docs: https://supabase.com/docs/reference/javascript/select")
}

main().catch((error) => {
  console.error("Diagnostic failed:", error.message)
  process.exitCode = 1
})
