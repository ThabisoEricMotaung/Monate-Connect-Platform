"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  clearDemoStoryData,
  DEMO_STORY_SQL,
  getDemoStoryConfig,
  getDemoStorySummary,
  loadDemoStory,
  type DemoStoryResult,
  type DemoStoryType,
} from "@/lib/demoStories"

type StoryAction = DemoStoryType | "clear"

const storyActions: { action: StoryAction; label: string; description: string }[] = [
  {
    action: "mining",
    label: "Load Mining Demo Story",
    description: "Mpumalanga mining maintenance RFQ with electrical, PPE and logistics suppliers.",
  },
  {
    action: "municipality",
    label: "Load Municipality Demo Story",
    description: "Municipal substation upgrade story with award, PO, contract, invoice and payment.",
  },
  {
    action: "supplier-onboarding",
    label: "Load Supplier Onboarding Demo Story",
    description: "Supplier readiness story from verification to RFQ participation and SmartScore improvement.",
  },
  {
    action: "clear",
    label: "Clear Demo Story Data",
    description: "Deletes only rows tagged with is_demo = true. Non-demo data is not deleted.",
  },
]

const storyHighlights = [
  "Mining maintenance RFQ in Mpumalanga",
  "Verified electrical supplier",
  "PPE supplier and logistics supplier",
  "Quote submission and award recommendation",
  "Purchase order lifecycle",
  "Contract, invoice and payment records",
  "SmartScore improvement and supplier risk signal",
  "Audit trail and WhatsApp alert draft",
]

const tableOrder = [
  "profiles",
  "rfqs",
  "quotes",
  "purchase_orders",
  "contracts",
  "invoices",
  "payments",
  "audit_logs",
  "notifications",
  "whatsapp_alerts",
  "supplier_score_history",
]

function statusClass(success: boolean) {
  return success
    ? "border-success/35 bg-success-soft text-success"
    : "border-rose-500/30 bg-rose-500/10 text-rose-700"
}

function SQLBlock() {
  const [copied, setCopied] = useState(false)

  function copySql() {
    navigator.clipboard.writeText(DEMO_STORY_SQL).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <section className="rounded-md border border-accent/25 bg-accent/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            SQL Required If Columns Are Missing
          </p>
          <h2 className="mt-2 text-lg font-semibold text-heading">Demo Story Data Flag</h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-secondary">
            Demo story rows are marked with{" "}
            <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-accent">
              is_demo = true
            </code>
            . Run this SQL once if any table reports a missing <code className="font-mono">is_demo</code>{" "}
            column.
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
        {DEMO_STORY_SQL.trim()}
      </pre>
    </section>
  )
}

export default function DemoStoryPage() {
  const router = useRouter()
  const [results, setResults] = useState<DemoStoryResult[]>([])
  const [runningAction, setRunningAction] = useState<StoryAction | null>(null)
  const [lastAction, setLastAction] = useState<StoryAction | null>(null)
  const [error, setError] = useState("")

  const summary = useMemo(() => getDemoStorySummary(results), [results])
  const miningStory = getDemoStoryConfig("mining")

  useEffect(() => {
    async function checkAccess() {
      const profile = await requireAdminOrBuyer()
      if (!profile) router.replace("/dashboard")
    }

    checkAccess()
  }, [router])

  async function runAction(action: StoryAction) {
    if (action === "clear") {
      const confirmed = window.confirm(
        "Clear demo story data only? Non-demo procurement records will not be deleted."
      )
      if (!confirmed) return
    }

    setRunningAction(action)
    setLastAction(action)
    setError("")

    try {
      const actionResults =
        action === "clear" ? await clearDemoStoryData() : await loadDemoStory(action)

      setResults(actionResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo story action failed.")
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Demo Story Pack
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Demo Data Story Pack
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
          Load a realistic South African procurement story for presenting Monate Connect to pilot
          partners, municipalities, mining houses, supplier networks and investors.
        </p>
      </div>

      <div className="mb-6 rounded-md border border-warning/30 bg-warning/8 px-5 py-4">
        <p className="text-sm font-bold text-warning">
          Demo story data should not be used in production procurement decisions.
        </p>
        <p className="mt-1 text-xs leading-6 text-secondary">
          Clear actions are scoped to rows tagged with{" "}
          <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-warning">
            is_demo = true
          </code>
          . The helper never intentionally deletes non-demo records.
        </p>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Primary Scenario
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading">
            {miningStory.rfqTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-secondary">
            A guided procurement story in {miningStory.province}: verified electrical supplier,
            PPE supplier, logistics supplier, quote submission, award recommendation, PO,
            contract, invoice, payment, SmartScore improvement, audit trail and WhatsApp alert.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {storyHighlights.map((item) => (
              <div
                key={item}
                className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-secondary"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Story Controls
          </p>
          <div className="mt-4 space-y-3">
            {storyActions.map((item) => (
              <button
                key={item.action}
                type="button"
                disabled={runningAction !== null}
                onClick={() => runAction(item.action)}
                className={[
                  "w-full rounded-md border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                  item.action === "clear"
                    ? "border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20"
                    : "border-accent/40 bg-accent/10 hover:bg-accent/15",
                ].join(" ")}
              >
                <span className="block text-sm font-semibold text-heading">
                  {runningAction === item.action ? "Working..." : item.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-secondary">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
            Inserted
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">
            {summary.inserted.toLocaleString("en-ZA")}
          </p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
            Deleted
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">
            {summary.deleted.toLocaleString("en-ZA")}
          </p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
            Table Warnings
          </p>
          <p className="mt-2 text-3xl font-bold text-heading">
            {summary.failures.toLocaleString("en-ZA")}
          </p>
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
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
              Execution Log
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Story Pack Table Results
            </h2>
          </div>
          <p className="text-xs text-muted">
            {lastAction ? `Last action: ${lastAction}` : "No story action run yet."}
          </p>
        </div>

        {results.length === 0 ? (
          <div className="rounded-md border border-dashed border-panel bg-panel p-10 text-center">
            <p className="text-sm font-semibold text-heading">No demo story results yet.</p>
            <p className="mt-1 text-xs text-muted">
              Load or clear a story to see table-by-table diagnostics.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-panel">
            <table className="min-w-full divide-y divide-panel">
              <thead className="bg-panel">
                <tr>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                    Count
                  </th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel bg-card">
                {results
                  .slice()
                  .sort((a, b) => {
                    const aIndex = tableOrder.indexOf(a.table)
                    const bIndex = tableOrder.indexOf(b.table)
                    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
                  })
                  .map((item, index) => (
                    <tr key={`${item.table}-${item.action}-${index}`}>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-heading">
                        {item.table}
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary">{item.action}</td>
                      <td className="px-4 py-3 text-xs text-secondary">
                        {item.count.toLocaleString("en-ZA")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusClass(item.success)}`}
                        >
                          {item.success ? "Success" : "Warning"}
                        </span>
                      </td>
                      <td className="max-w-xl px-4 py-3 text-xs leading-5 text-secondary">
                        {item.message}
                      </td>
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
