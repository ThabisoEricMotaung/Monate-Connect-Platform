"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getAuditLogs, type AuditLog } from "@/lib/audit"
import { requireAdminOrBuyer } from "@/lib/auth"

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatDateTime(value: string | null): string {
  if (!value) return "-"

  return new Date(value).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatJson(value: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) return "-"

  return JSON.stringify(value, null, 2)
}

function summarizeLog(log: AuditLog): string {
  const parts = [
    log.old_values ? "Old values captured" : null,
    log.new_values ? "New values captured" : null,
    log.metadata ? "Metadata attached" : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" | ") : "No additional details"
}

export default function AdminAuditTrailPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [filters, setFilters] = useState({
    action: "",
    entity_type: "",
    user_email: "",
    start_date: "",
    end_date: "",
  })

  async function loadLogs(nextFilters = filters) {
    setLoading(true)
    setErrorMessage("")

    try {
      const data = await getAuditLogs(nextFilters)
      setLogs(data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Audit logs failed to load.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      await loadLogs()
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const options = useMemo(() => {
    return {
      actions: Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort(),
      entityTypes: Array.from(new Set(logs.map((log) => log.entity_type).filter(Boolean))).sort(),
      userEmails: Array.from(new Set(logs.map((log) => log.user_email).filter(Boolean))).sort() as string[],
    }
  }, [logs])

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    const cleared = {
      action: "",
      entity_type: "",
      user_email: "",
      start_date: "",
      end_date: "",
    }
    setFilters(cleared)
    loadLogs(cleared)
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Governance
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Procurement Audit Trail
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review procurement actions, entity changes, decision metadata, and
          user attribution for enterprise traceability and compliance oversight.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Audit trail failed to load</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <label htmlFor="audit-action" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Action
            </label>
            <input
              id="audit-action"
              list="audit-action-options"
              value={filters.action}
              onChange={(event) => updateFilter("action", event.target.value)}
              placeholder="quote.awarded"
              className={filterClass}
            />
            <datalist id="audit-action-options">
              {options.actions.map((action) => (
                <option key={action} value={action} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="audit-entity" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Entity Type
            </label>
            <input
              id="audit-entity"
              list="audit-entity-options"
              value={filters.entity_type}
              onChange={(event) => updateFilter("entity_type", event.target.value)}
              placeholder="purchase_order"
              className={filterClass}
            />
            <datalist id="audit-entity-options">
              {options.entityTypes.map((entityType) => (
                <option key={entityType} value={entityType} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="audit-user" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              User Email
            </label>
            <input
              id="audit-user"
              list="audit-user-options"
              value={filters.user_email}
              onChange={(event) => updateFilter("user_email", event.target.value)}
              placeholder="admin@example.com"
              className={filterClass}
            />
            <datalist id="audit-user-options">
              {options.userEmails.map((email) => (
                <option key={email} value={email} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="audit-start" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Start Date
            </label>
            <input
              id="audit-start"
              type="date"
              value={filters.start_date}
              onChange={(event) => updateFilter("start_date", event.target.value)}
              className={filterClass}
            />
          </div>

          <div>
            <label htmlFor="audit-end" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              End Date
            </label>
            <input
              id="audit-end"
              type="date"
              value={filters.end_date}
              onChange={(event) => updateFilter("end_date", event.target.value)}
              className={filterClass}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => loadLogs()}
            className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
          >
            Clear
          </button>
        </div>
      </section>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No audit logs found.</p>
          <p className="mt-2 text-xs text-muted">
            Audit entries will appear here once procurement actions are logged.
          </p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {["Date/time", "User email", "Action", "Entity type", "Entity ID", "Summary/details", "Metadata"].map((heading) => (
                    <th key={heading} className="px-4 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-panel">
                {logs.map((log) => (
                  <tr key={`${log.id ?? log.created_at}-${log.action}-${log.entity_id}`} className="align-top transition-colors hover:bg-surface">
                    <td className="whitespace-nowrap px-4 py-4 text-secondary">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-heading">
                      {log.user_email || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-accent">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-secondary">{log.entity_type}</td>
                    <td className="px-4 py-4 font-mono text-xs text-secondary">
                      {log.entity_id || "-"}
                    </td>
                    <td className="max-w-[360px] px-4 py-4 text-secondary">
                      <p className="mb-2 text-xs font-semibold text-heading">{summarizeLog(log)}</p>
                      <details className="rounded-md border border-panel bg-panel p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-accent">
                          View change values
                        </summary>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <pre className="max-h-48 overflow-auto rounded bg-card p-3 text-[0.7rem] leading-5 text-secondary">
                            {formatJson(log.old_values)}
                          </pre>
                          <pre className="max-h-48 overflow-auto rounded bg-card p-3 text-[0.7rem] leading-5 text-secondary">
                            {formatJson(log.new_values)}
                          </pre>
                        </div>
                      </details>
                    </td>
                    <td className="max-w-[320px] px-4 py-4">
                      <pre className="max-h-48 overflow-auto rounded-md border border-panel bg-panel p-3 text-[0.7rem] leading-5 text-secondary">
                        {formatJson(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-panel px-5 py-3">
            <p className="text-xs text-muted">
              Showing {logs.length} audit entr{logs.length === 1 ? "y" : "ies"}.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
