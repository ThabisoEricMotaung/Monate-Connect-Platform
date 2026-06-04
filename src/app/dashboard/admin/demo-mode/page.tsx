"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  clearDemoData,
  DEMO_MODE_SQL,
  generateDemoData,
  getDemoSeedSummary,
  resetDemoEnvironment,
  type DemoSeedResult,
} from "@/lib/demoSeed"

type ActionType = "generate" | "clear" | "reset"

const actionLabels: Record<ActionType, string> = {
  generate: "Generate Demo Data",
  clear: "Clear Demo Data",
  reset: "Reset Demo Environment",
}

function statusClass(success: boolean): string {
  return success
    ? "border-success/35 bg-success-soft text-success"
    : "border-rose-500/30 bg-rose-500/10 text-rose-700"
}

function SQLBlock() {
  const [copied, setCopied] = useState(false)

  function copySql() {
    navigator.clipboard.writeText(DEMO_MODE_SQL).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <section className="rounded-md border border-accent/25 bg-accent/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Database Preparation</p>
          <h2 className="mt-2 text-lg font-semibold text-heading">Required Demo Flag SQL</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-secondary">
            Demo mode tags every row with <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-accent">is_demo = true</code>.
            Run this once if any table reports a missing column.
          </p>
        </div>
        <button
          type="button"
          onClick={copySql}
          className="inline-flex w-fit items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
        >
          {copied ? "Copied" : "Copy SQL"}
        </button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-md border border-panel bg-card px-4 py-3 font-mono text-[0.68rem] leading-6 text-secondary">
        {DEMO_MODE_SQL.trim()}
      </pre>
    </section>
  )
}

export default function DemoModePage() {
  const router = useRouter()
  const [results, setResults] = useState<DemoSeedResult[]>([])
  const [runningAction, setRunningAction] = useState<ActionType | null>(null)
  const [error, setError] = useState("")
  const [lastAction, setLastAction] = useState<ActionType | null>(null)

  const summary = useMemo(() => getDemoSeedSummary(results), [results])

  useEffect(() => {
    async function checkAccess() {
      const profile = await requireAdminOrBuyer()
      if (!profile) router.replace("/dashboard")
    }

    checkAccess()
  }, [router])

  async function runAction(action: ActionType) {
    if (action === "clear") {
      const confirmed = window.confirm(
        "Clear demo data only? Non-demo procurement records will not be deleted."
      )
      if (!confirmed) return
    }

    if (action === "reset") {
      const confirmed = window.confirm(
        "Reset demo environment? This deletes only is_demo records, then generates a fresh demo dataset."
      )
      if (!confirmed) return
    }

    setRunningAction(action)
    setLastAction(action)
    setError("")

    try {
      const actionResults =
        action === "generate"
          ? await generateDemoData()
          : action === "clear"
            ? await clearDemoData()
            : await resetDemoEnvironment()

      setResults(actionResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo mode action failed.")
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Demo Environment</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Demo Mode &amp; Seed Data Generator</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
          Populate Monate Connect with realistic South African procurement demo data for testing,
          investor walkthroughs, stakeholder demos, and internal training.
        </p>
      </div>

      <div className="mb-6 rounded-md border border-warning/30 bg-warning/8 px-5 py-4">
        <p className="text-sm font-bold text-warning">Demo data should not be used in production procurement decisions.</p>
        <p className="mt-1 text-xs leading-6 text-secondary">
          Demo actions are scoped to rows tagged with <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-warning">is_demo = true</code>.
          Clear and reset actions never intentionally delete non-demo records.
        </p>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Seed Dataset</p>
          <h2 className="mt-2 text-xl font-semibold text-heading">South African Procurement Demo Pack</h2>
          <p className="mt-2 text-sm leading-7 text-secondary">
            Includes suppliers, RFQs, quotes, purchase orders, contracts, invoices, payments,
            messages, clarification questions, banking details, audit logs, and SmartScore history.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              "Mining services",
              "Electrical",
              "Construction",
              "Logistics",
              "PPE",
              "Cleaning",
              "Agriculture",
              "ICT",
              "Water services",
            ].map((item) => (
              <div key={item} className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-secondary">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Actions</p>
          <div className="mt-4 space-y-3">
            {(["generate", "clear", "reset"] as ActionType[]).map((action) => (
              <button
                key={action}
                type="button"
                disabled={runningAction !== null}
                onClick={() => runAction(action)}
                className={[
                  "flex w-full items-center justify-center rounded-md border px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                  action === "clear"
                    ? "border-rose-500/35 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20"
                    : action === "reset"
                      ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
                      : "border-accent bg-accent text-button hover:bg-accent-strong",
                ].join(" ")}
              >
                {runningAction === action ? "Working..." : actionLabels[action]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Inserted</p>
          <p className="mt-2 text-3xl font-bold text-heading">{summary.inserted.toLocaleString("en-ZA")}</p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Deleted</p>
          <p className="mt-2 text-3xl font-bold text-heading">{summary.deleted.toLocaleString("en-ZA")}</p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Table Errors</p>
          <p className="mt-2 text-3xl font-bold text-heading">{summary.failures.toLocaleString("en-ZA")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="mb-5 flex flex-col gap-2 border-b border-panel pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">Execution Log</p>
            <h2 className="mt-2 text-xl font-semibold text-heading">Demo Mode Results</h2>
          </div>
          <p className="text-xs text-muted">
            {lastAction ? `Last action: ${actionLabels[lastAction]}` : "No action run yet."}
          </p>
        </div>

        {results.length === 0 ? (
          <div className="rounded-md border border-dashed border-panel bg-panel p-10 text-center">
            <p className="text-sm font-semibold text-heading">No demo action results yet.</p>
            <p className="mt-1 text-xs text-muted">Generate, clear, or reset demo data to see table-by-table diagnostics.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-panel">
            <table className="min-w-full divide-y divide-panel">
              <thead className="bg-panel">
                <tr>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Table</th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Action</th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Count</th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Status</th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel bg-card">
                {results.map((item) => (
                  <tr key={`${item.table}-${item.action}`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-heading">{item.table}</td>
                    <td className="px-4 py-3 text-xs text-secondary">{item.action}</td>
                    <td className="px-4 py-3 text-xs text-secondary">{item.count.toLocaleString("en-ZA")}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusClass(item.success)}`}>
                        {item.success ? "Success" : "Error"}
                      </span>
                    </td>
                    <td className="max-w-xl px-4 py-3 text-xs leading-5 text-secondary">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SQLBlock />
    </div>
  )
}
