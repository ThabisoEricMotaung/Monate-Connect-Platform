"use client"

/*
 * ─── procurement_overrides SQL migration ──────────────────────────────────────
 *
 * create table if not exists procurement_overrides (
 *   id bigint generated always as identity primary key,
 *   entity_type text,
 *   entity_id text,
 *   blocked_reason text,
 *   override_reason text,
 *   requested_by uuid,
 *   requested_by_email text,
 *   approved_by uuid,
 *   approved_by_email text,
 *   status text default 'Requested',
 *   created_at timestamptz default timezone('utc', now()),
 *   approved_at timestamptz
 * );
 * alter table procurement_overrides enable row level security;
 * create policy "Read procurement overrides" on procurement_overrides for select using (true);
 * create policy "Insert procurement overrides" on procurement_overrides for insert with check (true);
 * create policy "Update procurement overrides" on procurement_overrides for update using (true);
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  getOverrides,
  approveOverride,
  rejectOverride,
  type ProcurementOverride,
} from "@/lib/procurementOverrides"
import { canUserApprove } from "@/lib/delegationAuthority"

// ─── Constants ────────────────────────────────────────────────────────────────

const MIGRATION_SQL = `create table if not exists procurement_overrides (
  id bigint generated always as identity primary key,
  entity_type text,
  entity_id text,
  blocked_reason text,
  override_reason text,
  requested_by uuid,
  requested_by_email text,
  approved_by uuid,
  approved_by_email text,
  status text default 'Requested',
  created_at timestamptz default timezone('utc', now()),
  approved_at timestamptz
);
alter table procurement_overrides enable row level security;
create policy "Read procurement overrides" on procurement_overrides for select using (true);
create policy "Insert procurement overrides" on procurement_overrides for insert with check (true);
create policy "Update procurement overrides" on procurement_overrides for update using (true);`

const ENTITY_TYPE_LABELS: Record<string, string> = {
  invoice:        "Invoice",
  payment:        "Payment",
  quote:          "Quote Award",
  purchase_order: "Purchase Order",
  contract:       "Contract",
  rfq:            "RFQ",
  supplier:       "Supplier",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string | null): string {
  switch (status) {
    case "Approved":  return "border-success/40 bg-success/10 text-success"
    case "Rejected":  return "border-rose-500/35 bg-rose-500/10 text-rose-700"
    case "Requested": return "border-warning/40 bg-warning/10 text-warning"
    default:          return "border-panel bg-surface text-secondary"
  }
}

function statusDot(status: string | null): string {
  switch (status) {
    case "Approved":  return "bg-success"
    case "Rejected":  return "bg-rose-500"
    case "Requested": return "bg-warning"
    default:          return "bg-muted"
  }
}

function fmtDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function entityLabel(t: string | null): string {
  return ENTITY_TYPE_LABELS[t ?? ""] ?? (t ?? "—")
}

// ─── SQL block ────────────────────────────────────────────────────────────────

function SQLBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(sql).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div className="mb-5 rounded-md border border-accent/25 bg-accent/5">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left" aria-expanded={open}>
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p className="text-sm font-semibold text-accent">Database migration required — procurement_overrides</p>
        </div>
        <svg className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-accent/20">
          <div className="flex items-center justify-between px-5 py-2">
            <p className="text-xs text-secondary">Run in Supabase → SQL Editor, then refresh.</p>
            <button type="button" onClick={copy}
              className="rounded border border-panel bg-surface px-3 py-1 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
              {copied ? "Copied ✓" : "Copy SQL"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-b-md bg-heading/5 px-5 py-4 font-mono text-[0.68rem] leading-relaxed text-secondary">{sql}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Override card ────────────────────────────────────────────────────────────

function OverrideCard({
  override,
  onApprove,
  onReject,
  processing,
}: {
  override: ProcurementOverride
  onApprove: (id: number) => void
  onReject: (id: number) => void
  processing: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isPending = override.status === "Requested"

  return (
    <div className={[
      "overflow-hidden rounded-md border bg-card shadow-panel",
      override.status === "Requested" ? "border-warning/30" : "border-panel",
    ].join(" ")}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-surface/40"
        aria-expanded={expanded}
      >
        {/* Status dot */}
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(override.status)}`} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-heading">
              {entityLabel(override.entity_type)} Override
            </span>
            <code className="rounded border border-panel bg-surface px-1.5 py-0.5 font-mono text-[0.63rem] text-secondary">
              {override.entity_type}/{override.entity_id ?? "—"}
            </code>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${statusBadge(override.status)}`}>
              {override.status ?? "Requested"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            Requested by {override.requested_by_email ?? "unknown"} · {fmtDate(override.created_at)}
          </p>
        </div>

        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-panel px-5 pb-5 pt-4">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Left: details */}
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Blocked Reason</p>
                <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                  <p className="text-xs leading-relaxed text-rose-700">
                    {override.blocked_reason ?? "No reason provided."}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">Override Justification</p>
                <div className="rounded-md border border-panel bg-surface px-4 py-3">
                  <p className="text-xs leading-relaxed text-secondary">
                    {override.override_reason ?? "No justification provided."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Entity Type",    value: entityLabel(override.entity_type) },
                  { label: "Entity ID",      value: override.entity_id ?? "—" },
                  { label: "Requested By",   value: override.requested_by_email ?? "—" },
                  { label: "Requested At",   value: fmtDate(override.created_at) },
                  ...(override.approved_by_email ? [
                    { label: "Reviewed By",  value: override.approved_by_email },
                    { label: "Reviewed At",  value: fmtDate(override.approved_at) },
                  ] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-heading">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: actions */}
            <div className="space-y-4">
              {override.status === "Approved" && (
                <div className="rounded-md border border-success/30 bg-success-soft px-4 py-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p className="text-sm font-bold text-success">Override Approved</p>
                  </div>
                  <p className="mt-1 text-xs text-success/80">
                    Approved by {override.approved_by_email ?? "unknown"} on {fmtDate(override.approved_at)}.
                    The requestor may now proceed with the blocked action.
                  </p>
                </div>
              )}

              {override.status === "Rejected" && (
                <div className="rounded-md border border-rose-500/25 bg-rose-500/8 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p className="text-sm font-bold text-rose-700">Override Rejected</p>
                  </div>
                  <p className="mt-1 text-xs text-rose-700/80">
                    Rejected by {override.approved_by_email ?? "unknown"} on {fmtDate(override.approved_at)}.
                    The blocked action remains enforced.
                  </p>
                </div>
              )}

              {isPending && (
                <>
                  <div className="rounded-md border border-warning/25 bg-warning/8 px-4 py-3">
                    <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-warning">Advisory</p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">
                      Approving this override will allow the requestor to bypass the blocked compliance check. Ensure the justification is adequate and that approval is in accordance with procurement policy.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => onApprove(override.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-success bg-success px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processing ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      )}
                      Approve Override
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => onReject(override.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Reject Override
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="flex items-start gap-4">
        <div className="mt-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-panel" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-52 animate-pulse rounded bg-panel" />
          <div className="h-3 w-40 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-5 w-20 animate-pulse rounded-full bg-panel" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverridesPage() {
  const router = useRouter()
  const [overrides, setOverrides] = useState<ProcurementOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")
  const [success, setSuccess] = useState("")
  const [approverId, setApproverId] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      setApproverId(profile.id ?? "")
      const data = await getOverrides()
      setOverrides(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleApprove(id: number) {
    setProcessingId(id)
    setSuccess("")
    setError("")

    const hasAuthority = await canUserApprove(approverId, "overrides")
    if (!hasAuthority) {
      setError("You do not have delegation authority for this action.")
      setProcessingId(null)
      return
    }

    const updated = await approveOverride(id)
    if (updated) {
      setOverrides((prev) => prev.map((o) => o.id === id ? updated : o))
      setSuccess("Override approved. The requestor may now proceed with the blocked action.")
    } else {
      setError("Failed to approve override.")
    }
    setProcessingId(null)
  }

  async function handleReject(id: number) {
    setProcessingId(id)
    setSuccess("")
    const updated = await rejectOverride(id)
    if (updated) {
      setOverrides((prev) => prev.map((o) => o.id === id ? updated : o))
      setSuccess("Override rejected. The blocked action remains enforced.")
    } else {
      setError("Failed to reject override.")
    }
    setProcessingId(null)
  }

  const summary = useMemo(() => ({
    requested: overrides.filter((o) => o.status === "Requested").length,
    approved:  overrides.filter((o) => o.status === "Approved").length,
    rejected:  overrides.filter((o) => o.status === "Rejected").length,
  }), [overrides])

  const entityTypes = useMemo(() => {
    const set = new Set(overrides.map((o) => o.entity_type).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [overrides])

  const filtered = useMemo(() => {
    return overrides.filter((o) => {
      if (statusFilter !== "All" && o.status !== statusFilter) return false
      if (typeFilter !== "All" && o.entity_type !== typeFilter) return false
      return true
    })
  }, [overrides, statusFilter, typeFilter])

  const selectCls =
    "rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent"

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Governance</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Procurement Override Management</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Review and adjudicate override requests raised when procurement actions are blocked by
          policy compliance checks. All decisions are logged to the audit trail.
        </p>
      </div>

      <SQLBlock sql={MIGRATION_SQL} />

      {error && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{success}</p>
        </div>
      )}

      {/* Advisory */}
      <div className="mb-5 flex items-start gap-3 rounded-md border border-warning/25 bg-warning/6 px-5 py-4">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-xs text-secondary">
          <strong className="text-heading">Override approval carries procurement risk.</strong>{" "}
          Only approve overrides with adequate documented justification, and ensure approval is in
          accordance with your organisation&apos;s delegation of authority and procurement policy.
          All approvals are permanently logged to the audit trail.
        </p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Pending Review", count: summary.requested, color: "text-warning",  border: "border-warning/30" },
            { label: "Approved",       count: summary.approved,  color: "text-success",  border: "border-success/30" },
            { label: "Rejected",       count: summary.rejected,  color: "text-rose-700", border: "border-rose-500/25" },
          ].map((item) => (
            <div key={item.label} className={`rounded-md border bg-card p-4 shadow-panel text-center ${item.border}`}>
              <p className={`text-3xl font-bold tabular-nums ${item.color}`}>{item.count}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wider text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!loading && overrides.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="All">All statuses</option>
            <option value="Requested">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="All">All entity types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{entityLabel(t)}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {["All", "Requested", "Approved", "Rejected"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={[
                  "rounded-md border px-3.5 py-2 text-xs font-semibold transition",
                  statusFilter === s
                    ? "border-accent bg-accent text-button"
                    : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
                ].join(" ")}
              >
                {s === "All" ? `All (${overrides.length})` : s}
                {s !== "All" && (
                  <span className="ml-1.5 opacity-70">
                    ({s === "Requested" ? summary.requested : s === "Approved" ? summary.approved : summary.rejected})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && overrides.length === 0 && (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No override requests</p>
          <p className="mt-1 text-xs text-muted">
            Override requests will appear here when admins request to bypass blocked compliance checks.
          </p>
        </div>
      )}

      {!loading && overrides.length > 0 && filtered.length === 0 && (
        <div className="flex min-h-[120px] items-center justify-center rounded-md border border-panel bg-card shadow-panel">
          <p className="text-sm text-muted">No overrides match the selected filters.</p>
        </div>
      )}

      {/* Override cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((override) => (
            <OverrideCard
              key={override.id}
              override={override}
              onApprove={handleApprove}
              onReject={handleReject}
              processing={processingId === override.id}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && overrides.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-3 shadow-panel">
          <p className="text-xs text-muted">
            Showing {filtered.length} of {overrides.length} override request{overrides.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted">
            All approvals and rejections are logged to the audit trail.
          </p>
        </div>
      )}
    </div>
  )
}
