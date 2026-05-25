"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type ActivityLog = {
  id: number
  created_at: string | null
  actor_email: string | null
  action: string | null
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown> | null
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalize(value: string | null): string {
  return (value ?? "").trim()
}

function metadataSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) return "-"

  return Object.entries(metadata)
    .slice(0, 5)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return `${key}: -`
      }

      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`
      }

      return `${key}: ${String(value)}`
    })
    .join(" | ")
}

function ActivitySkeleton() {
  return (
    <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="h-4 w-64 animate-pulse rounded bg-panel" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-panel" />
        ))}
      </div>
    </div>
  )
}

export default function AdminActivityPage() {
  const router = useRouter()
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [actionFilter, setActionFilter] = useState("")
  const [entityTypeFilter, setEntityTypeFilter] = useState("")
  const [actorEmailSearch, setActorEmailSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadActivityLogs() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, created_at, actor_email, action, entity_type, entity_id, metadata")
        .order("created_at", { ascending: false })
        .limit(250)

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setActivityLogs((data ?? []) as ActivityLog[])
      setLoading(false)
    }

    loadActivityLogs()
  }, [router])

  const actionOptions = useMemo(
    () =>
      Array.from(
        new Set(activityLogs.map((log) => log.action).filter(Boolean))
      ).sort() as string[],
    [activityLogs]
  )

  const entityTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(activityLogs.map((log) => log.entity_type).filter(Boolean))
      ).sort() as string[],
    [activityLogs]
  )

  const filteredActivityLogs = useMemo(() => {
    const actorNeedle = actorEmailSearch.trim().toLowerCase()

    return activityLogs.filter((log) => {
      const actionMatches = !actionFilter || log.action === actionFilter
      const entityTypeMatches =
        !entityTypeFilter || log.entity_type === entityTypeFilter
      const actorMatches =
        !actorNeedle ||
        normalize(log.actor_email).toLowerCase().includes(actorNeedle)

      return actionMatches && entityTypeMatches && actorMatches
    })
  }, [actionFilter, activityLogs, actorEmailSearch, entityTypeFilter])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Accountability
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Activity Log
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review procurement actions, supplier decisions, submissions, and
          document uploads from a structured audit trail.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Activity log failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="activity-action-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Action
            </label>
            <select
              id="activity-action-filter"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="activity-entity-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Entity Type
            </label>
            <select
              id="activity-entity-filter"
              value={entityTypeFilter}
              onChange={(event) => setEntityTypeFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All entity types</option>
              {entityTypeOptions.map((entityType) => (
                <option key={entityType} value={entityType}>
                  {entityType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="activity-actor-search"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Actor Email
            </label>
            <input
              id="activity-actor-search"
              type="search"
              placeholder="Search actor email"
              value={actorEmailSearch}
              onChange={(event) => setActorEmailSearch(event.target.value)}
              className={filterClass}
            />
          </div>
        </div>
      </section>

      {loading && <ActivitySkeleton />}

      {!loading && !errorMessage && activityLogs.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No activity has been recorded yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Procurement actions will appear here after users create RFQs, submit
            quotes, update decisions, or upload documents.
          </p>
        </div>
      )}

      {!loading &&
        !errorMessage &&
        activityLogs.length > 0 &&
        filteredActivityLogs.length === 0 && (
          <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
            <p className="text-sm font-semibold text-heading">
              No activity matches these filters.
            </p>
            <p className="mt-2 text-xs text-muted">
              Adjust action, entity type, or actor email search.
            </p>
          </div>
        )}

      {!loading && !errorMessage && filteredActivityLogs.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Created",
                    "Actor",
                    "Action",
                    "Entity Type",
                    "Entity ID",
                    "Metadata Summary",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-panel">
                {filteredActivityLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="align-top transition-colors hover:bg-surface"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-secondary">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="break-words font-semibold text-heading">
                        {log.actor_email || "System"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-md border border-accent-soft bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">
                        {log.action || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-secondary">
                      {log.entity_type || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-secondary">
                        {log.entity_id || "-"}
                      </span>
                    </td>
                    <td className="max-w-[440px] px-4 py-4 text-secondary">
                      <p className="line-clamp-4 leading-6">
                        {metadataSummary(log.metadata)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-panel px-5 py-3">
            <p className="text-xs text-muted">
              Showing {filteredActivityLogs.length} of {activityLogs.length}
              recorded activit{activityLogs.length === 1 ? "y" : "ies"}.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
