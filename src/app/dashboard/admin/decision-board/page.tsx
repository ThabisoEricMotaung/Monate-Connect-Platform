"use client"

/*
 * ─── decision_board_items SQL migration ───────────────────────────────────────
 *
 * create table if not exists decision_board_items (
 *   id bigint generated always as identity primary key,
 *   item_type text,
 *   entity_id text,
 *   title text,
 *   description text,
 *   requested_by uuid,
 *   requested_by_email text,
 *   decision_status text default 'Pending',
 *   priority text default 'Normal',
 *   decision_notes text,
 *   created_at timestamptz default timezone('utc', now()),
 *   decided_at timestamptz
 * );
 * alter table decision_board_items enable row level security;
 * create policy "Read decision board items" on decision_board_items for select using (true);
 * create policy "Insert decision board items" on decision_board_items for insert with check (true);
 * create policy "Update decision board items" on decision_board_items for update using (true);
 */

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  getDecisionItems,
  updateDecisionStatus,
  DECISION_STATUSES,
  DECISION_PRIORITIES,
  ITEM_TYPES,
  type DecisionBoardItem,
  type DecisionStatus,
} from "@/lib/decisionBoard"
import { canUserApprove } from "@/lib/delegationAuthority"

// ─── Constants ────────────────────────────────────────────────────────────────

const MIGRATION_SQL = `create table if not exists decision_board_items (
  id bigint generated always as identity primary key,
  item_type text,
  entity_id text,
  title text,
  description text,
  requested_by uuid,
  requested_by_email text,
  decision_status text default 'Pending',
  priority text default 'Normal',
  decision_notes text,
  created_at timestamptz default timezone('utc', now()),
  decided_at timestamptz
);
alter table decision_board_items enable row level security;
create policy "Read decision board items" on decision_board_items for select using (true);
create policy "Insert decision board items" on decision_board_items for insert with check (true);
create policy "Update decision board items" on decision_board_items for update using (true);`

const ITEM_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  award_recommendation: { label: "Award",         icon: "🏆", color: "border-warning/40 bg-warning/10 text-warning" },
  purchase_order:       { label: "Purchase Order", icon: "📦", color: "border-sky-500/35 bg-sky-500/10 text-sky-700" },
  contract:             { label: "Contract",       icon: "📄", color: "border-violet-500/30 bg-violet-500/10 text-violet-700" },
  invoice_approval:     { label: "Invoice",        icon: "🧾", color: "border-accent/35 bg-accent/10 text-accent-strong" },
  payment:              { label: "Payment",        icon: "💳", color: "border-success/35 bg-success/10 text-success" },
  supplier_risk:        { label: "Supplier Risk",  icon: "⚠️", color: "border-rose-500/30 bg-rose-500/10 text-rose-700" },
}

const STATUS_META: Record<string, { color: string; dot: string }> = {
  "Pending":              { color: "border-warning/40 bg-warning/10 text-warning",      dot: "bg-warning" },
  "Approved":             { color: "border-success/40 bg-success/10 text-success",      dot: "bg-success" },
  "Rejected":             { color: "border-rose-500/30 bg-rose-500/10 text-rose-700",   dot: "bg-rose-500" },
  "More Info Requested":  { color: "border-sky-500/30 bg-sky-500/10 text-sky-700",      dot: "bg-sky-500" },
}

const PRIORITY_META: Record<string, { color: string }> = {
  Normal:   { color: "border-panel bg-surface text-muted" },
  High:     { color: "border-warning/40 bg-warning/10 text-warning" },
  Urgent:   { color: "border-rose-500/30 bg-rose-500/10 text-rose-600" },
  Critical: { color: "border-rose-600/40 bg-rose-600/10 text-rose-700" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function fmtDateTime(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function typeLabel(t: string | null): string {
  return ITEM_TYPE_META[t ?? ""]?.label ?? (t ?? "Unknown")
}

function typeIcon(t: string | null): string {
  return ITEM_TYPE_META[t ?? ""]?.icon ?? "📋"
}

function typeBadge(t: string | null): string {
  return ITEM_TYPE_META[t ?? ""]?.color ?? "border-panel bg-surface text-secondary"
}

function statusBadge(s: string | null): string {
  return STATUS_META[s ?? "Pending"]?.color ?? STATUS_META.Pending.color
}

function statusDot(s: string | null): string {
  return STATUS_META[s ?? "Pending"]?.dot ?? STATUS_META.Pending.dot
}

function priorityBadge(p: string | null): string {
  return PRIORITY_META[p ?? "Normal"]?.color ?? PRIORITY_META.Normal.color
}

function approvalTypeForDecision(itemType: string | null): string {
  switch (itemType) {
    case "award_recommendation": return "awards"
    case "purchase_order": return "rfqs"
    case "contract": return "contracts"
    case "invoice_approval": return "invoices"
    case "payment": return "payments"
    default: return "overrides"
  }
}

const inputCls =
  "rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

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
          <p className="text-sm font-semibold text-accent">Database migration required — decision_board_items</p>
        </div>
        <svg className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-accent/20">
          <div className="flex items-center justify-between px-5 py-2">
            <p className="text-xs text-secondary">Run in Supabase → SQL Editor, then refresh.</p>
            <button type="button" onClick={copy} className="rounded border border-panel bg-surface px-3 py-1 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
              {copied ? "Copied ✓" : "Copy SQL"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-b-md bg-heading/5 px-5 py-4 font-mono text-[0.68rem] leading-relaxed text-secondary">{sql}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, count, color, active, onClick,
}: {
  label: string; count: number; color: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1.5 rounded-md border p-4 text-center shadow-panel transition",
        color,
        active ? "ring-2 ring-accent ring-offset-1" : "hover:shadow-md",
      ].join(" ")}
    >
      <span className="text-3xl font-bold tabular-nums">{count}</span>
      <span className="text-[0.62rem] font-bold uppercase tracking-wider opacity-80">{label}</span>
    </button>
  )
}

// ─── Decision item card ───────────────────────────────────────────────────────

function DecisionCard({
  item,
  onDecision,
}: {
  item: DecisionBoardItem
  onDecision: (id: number, status: DecisionStatus, notes: string) => Promise<boolean>
}) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(item.decision_notes ?? "")
  const [processing, setProcessing] = useState(false)
  const [localStatus, setLocalStatus] = useState(item.decision_status)
  const [localNotes, setLocalNotes] = useState(item.decision_notes ?? "")

  async function decide(status: DecisionStatus) {
    if (status === "Rejected" && !notes.trim()) {
      setExpanded(true)
      return
    }
    setProcessing(true)
    const succeeded = await onDecision(item.id, status, notes)
    if (succeeded) {
      setLocalStatus(status)
      setLocalNotes(notes)
    }
    setProcessing(false)
  }

  const actionable = localStatus === "Pending" || localStatus === "More Info Requested"
  const isCriticalPriority = item.priority === "Critical" || item.priority === "Urgent"

  return (
    <div
      className={[
        "overflow-hidden rounded-md border bg-card shadow-panel transition",
        isCriticalPriority && actionable ? "border-rose-500/25" : "border-panel",
      ].join(" ")}
    >
      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-surface/40"
        aria-expanded={expanded}
      >
        {/* Type icon */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-panel bg-surface text-lg">
          {typeIcon(item.item_type)}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-heading">{item.title ?? "Untitled"}</span>
            {item.priority && item.priority !== "Normal" && (
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${priorityBadge(item.priority)}`}>
                {item.priority}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-bold ${typeBadge(item.item_type)}`}>
              {typeLabel(item.item_type)}
            </span>
            {item.requested_by_email && (
              <span className="text-[0.65rem] text-muted">
                by {item.requested_by_email}
              </span>
            )}
            <span className="text-[0.65rem] text-muted">{fmtDate(item.created_at)}</span>
          </div>
        </div>

        {/* Status + expand */}
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider ${statusBadge(localStatus)}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(localStatus)}`} aria-hidden="true" />
            {localStatus ?? "Pending"}
          </span>
          <svg
            className={`h-4 w-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-panel px-5 pb-5 pt-4">
          <div className="grid gap-5 lg:grid-cols-2">

            {/* Left: meta + description */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Item Type",    value: typeLabel(item.item_type) },
                  { label: "Entity ID",    value: item.entity_id ?? "—" },
                  { label: "Priority",     value: item.priority ?? "Normal" },
                  { label: "Status",       value: localStatus ?? "Pending" },
                  { label: "Requested By", value: item.requested_by_email ?? "—" },
                  { label: "Created",      value: fmtDateTime(item.created_at) },
                  ...(item.decided_at ? [{ label: "Decided", value: fmtDateTime(item.decided_at) }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-md border border-panel bg-panel p-3">
                    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-heading">{value}</p>
                  </div>
                ))}
              </div>

              {item.description && (
                <div>
                  <p className="mb-1.5 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Description</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-secondary">
                    {item.description}
                  </p>
                </div>
              )}

              {localNotes && (
                <div className="rounded-md border border-panel bg-surface px-4 py-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-secondary">Decision Notes</p>
                  <p className="mt-1 text-xs leading-relaxed text-secondary">{localNotes}</p>
                </div>
              )}
            </div>

            {/* Right: notes input + action buttons */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor={`notes-${item.id}`}
                  className="mb-1.5 block text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary"
                >
                  Decision Notes
                  {!actionable && " (read-only after decision)"}
                </label>
                <textarea
                  id={`notes-${item.id}`}
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!actionable || processing}
                  placeholder="Add rationale, conditions, or rejection reason…"
                  className="w-full resize-none rounded-md border border-panel bg-panel px-3 py-2.5 text-xs text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {localStatus === "Pending" && (
                  <p className="mt-1 text-[0.62rem] text-muted">Notes are required for Rejection.</p>
                )}
              </div>

              {actionable && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => decide("Approved")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-success bg-success px-4 py-2 text-xs font-bold text-button transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? (
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={processing || !notes.trim()}
                    onClick={() => decide("Rejected")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    title={!notes.trim() ? "Notes required before rejecting" : undefined}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Reject
                    {!notes.trim() && <span className="ml-1 opacity-60">(add notes first)</span>}
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => decide("More Info Requested")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/35 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Request More Information
                  </button>
                </div>
              )}

              {!actionable && (
                <div className={`flex items-center gap-2 rounded-md border px-4 py-3 ${statusBadge(localStatus)}`}>
                  <span className={`h-2 w-2 rounded-full ${statusDot(localStatus)}`} aria-hidden="true" />
                  <span className="text-xs font-semibold">Decision recorded: {localStatus}</span>
                </div>
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
        <div className="h-9 w-9 animate-pulse rounded-lg bg-panel" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-52 animate-pulse rounded bg-panel" />
          <div className="flex gap-2">
            <div className="h-4 w-20 animate-pulse rounded-full bg-panel" />
            <div className="h-4 w-28 animate-pulse rounded bg-panel" />
          </div>
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-panel" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionBoardPage() {
  const router = useRouter()
  const [items, setItems] = useState<DecisionBoardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [approverId, setApproverId] = useState("")

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [priorityFilter, setPriorityFilter] = useState<string>("All")
  const [typeFilter, setTypeFilter] = useState<string>("All")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      setApproverId(profile.id ?? "")

      const data = await getDecisionItems()
      setItems(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleDecision(id: number, status: DecisionStatus, notes: string): Promise<boolean> {
    setError("")
    const item = items.find((current) => current.id === id)

    if (status === "Approved") {
      const hasAuthority = await canUserApprove(
        approverId,
        approvalTypeForDecision(item?.item_type ?? null)
      )

      if (!hasAuthority) {
        setError("You do not have delegation authority for this action.")
        return false
      }
    }

    const updated = await updateDecisionStatus(id, status, notes)
    if (updated) {
      setItems((prev) => prev.map((item) => item.id === id ? updated : item))
      return true
    }
    setError("Decision update failed.")
    return false
  }

  const summary = useMemo(() => ({
    pending:      items.filter((i) => i.decision_status === "Pending").length,
    approved:     items.filter((i) => i.decision_status === "Approved").length,
    rejected:     items.filter((i) => i.decision_status === "Rejected").length,
    highPriority: items.filter((i) => i.priority === "High" || i.priority === "Urgent" || i.priority === "Critical").length,
    total: items.length,
  }), [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== "All" && item.decision_status !== statusFilter) return false
      if (priorityFilter !== "All" && item.priority !== priorityFilter) return false
      if (typeFilter !== "All" && item.item_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !(item.title ?? "").toLowerCase().includes(q) &&
          !(item.requested_by_email ?? "").toLowerCase().includes(q) &&
          !(item.entity_id ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [items, statusFilter, priorityFilter, typeFilter, search])

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Governance</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Procurement Decision Board</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Committee-style approval workspace for high-value awards, contracts, payments, and supplier
          risk escalations. All decisions are recorded with audit notes.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      <SQLBlock sql={MIGRATION_SQL} />

      {/* Advisory */}
      <div className="mb-5 flex items-start gap-3 rounded-md border border-accent/20 bg-accent/5 px-5 py-4">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-secondary">
          Decision board items are automatically raised when high-value purchase orders, contract approvals,
          invoice approvals, payments, award recommendations, and critical supplier risk events are processed.
          All decisions are advisory records — formal actions are still performed in the originating workflow.
        </p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Pending Decisions" count={summary.pending}
            color="border-warning/40 bg-warning/10 text-warning"
            active={statusFilter === "Pending"}
            onClick={() => setStatusFilter(statusFilter === "Pending" ? "All" : "Pending")}
          />
          <SummaryCard
            label="Approved" count={summary.approved}
            color="border-success/40 bg-success/10 text-success"
            active={statusFilter === "Approved"}
            onClick={() => setStatusFilter(statusFilter === "Approved" ? "All" : "Approved")}
          />
          <SummaryCard
            label="Rejected" count={summary.rejected}
            color="border-rose-500/30 bg-rose-500/10 text-rose-700"
            active={statusFilter === "Rejected"}
            onClick={() => setStatusFilter(statusFilter === "Rejected" ? "All" : "Rejected")}
          />
          <SummaryCard
            label="High Priority" count={summary.highPriority}
            color="border-rose-500/30 bg-rose-500/8 text-rose-600"
            active={priorityFilter !== "All"}
            onClick={() => setPriorityFilter(priorityFilter !== "All" ? "All" : "High")}
          />
        </div>
      )}

      {/* Filters */}
      {!loading && items.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, requester, or entity ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} w-full pl-10`}
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="All">All statuses</option>
            {DECISION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputCls}>
            <option value="All">All priorities</option>
            {DECISION_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls}>
            <option value="All">All types</option>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{ITEM_TYPE_META[t]?.label ?? t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status + priority filter tabs */}
      {!loading && items.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {["All", ...DECISION_STATUSES].map((s) => (
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
              {s}
              {s !== "All" && (
                <span className="ml-1.5 opacity-70">
                  ({items.filter((i) => i.decision_status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty states */}
      {!loading && items.length === 0 && !error && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-12 w-12 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No decision items yet</p>
          <p className="mt-1 max-w-sm text-center text-xs text-muted">
            Items will appear automatically when high-value purchase orders, contracts, invoice approvals,
            payments, award recommendations, or supplier risk escalations are processed.
          </p>
          <p className="mt-3 text-xs text-muted">
            Make sure the <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-accent">decision_board_items</code> table exists — see the SQL migration above.
          </p>
        </div>
      )}

      {!loading && items.length > 0 && filtered.length === 0 && (
        <div className="flex min-h-[140px] items-center justify-center rounded-md border border-panel bg-card shadow-panel">
          <p className="text-sm text-muted">No items match the selected filters.</p>
        </div>
      )}

      {/* Decision item list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => (
            <DecisionCard key={item.id} item={item} onDecision={handleDecision} />
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && items.length > 0 && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-3 shadow-panel">
          <p className="text-xs text-muted">
            Showing {filtered.length} of {items.length} decision item{items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted">
            {summary.pending} pending · {summary.approved} approved · {summary.rejected} rejected
          </p>
        </div>
      )}
    </div>
  )
}
