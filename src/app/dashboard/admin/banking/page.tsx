"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { logAuditAction } from "@/lib/audit"
import { supabase } from "@/lib/supabase"

// --- Types --------------------------------------------------------------------

type BankRecord = {
  id: number
  supplier_id: string | null
  bank_name: string | null
  account_holder: string | null
  account_number: string | null
  branch_code: string | null
  account_type: string | null
  verification_status: string | null
  verification_notes: string | null
  created_at: string | null
  // enriched from profiles join
  business_name?: string | null
  province?: string | null
  industry?: string | null
  profile_verification_status?: string | null
}

const VERIFICATION_STATUSES = ["Unverified", "Under Review", "Verified", "Rejected"] as const
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

// --- Helpers ------------------------------------------------------------------

function statusBadge(status: string | null): string {
  switch (status) {
    case "Verified":     return "border-success/40 bg-success/10 text-success"
    case "Under Review": return "border-sky-500/35 bg-sky-500/10 text-sky-700"
    case "Rejected":     return "border-rose-500/35 bg-rose-500/10 text-rose-700"
    default:             return "border-warning/40 bg-warning/10 text-warning"
  }
}

function fmtDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function maskAccount(n: string | null): string {
  if (!n) return "—"
  if (n.length <= 4) return n
  return "•".repeat(n.length - 4) + n.slice(-4)
}

// --- Verification panel -------------------------------------------------------

function VerificationPanel({
  record,
  onSaved,
}: {
  record: BankRecord
  onSaved: (id: number, status: VerificationStatus, notes: string) => void
}) {
  const [status, setStatus] = useState<VerificationStatus>(
    (VERIFICATION_STATUSES.includes(record.verification_status as VerificationStatus)
      ? record.verification_status
      : "Unverified") as VerificationStatus
  )
  const [notes, setNotes] = useState(record.verification_notes ?? "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!supabase) return
    setSaving(true)
    const { error } = await supabase
      .from("supplier_bank_details")
      .update({ verification_status: status, verification_notes: notes.trim() || null })
      .eq("id", record.id)
    setSaving(false)
    if (error) { console.error(error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    onSaved(record.id, status, notes.trim())
    try {
      await logAuditAction({
        action:
          status === "Verified"
            ? "banking_details.verified"
            : status === "Rejected"
              ? "banking_details.rejected"
              : "banking_details.reviewed",
        entity_type: "supplier_bank_details",
        entity_id: record.id,
        old_values: {
          verification_status: record.verification_status,
          verification_notes: record.verification_notes,
        },
        new_values: {
          verification_status: status,
          verification_notes: notes.trim() || null,
        },
        metadata: {
          supplier_id: record.supplier_id,
          bank_name: record.bank_name,
        },
      })
      await logActivity({
        action: "supplier.banking_verified",
        entity_type: "supplier_profile",
        entity_id: record.supplier_id ?? record.id,
        metadata: { verification_status: status, bank_record_id: record.id },
      })
    } catch (auditError) {
      console.warn("Banking verification audit/activity logging failed:", auditError)
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-panel bg-surface p-4">
      <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-accent">
        Verification Decision
      </p>

      <div>
        <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
          Verification Status
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VERIFICATION_STATUSES.map((s) => (
            <label
              key={s}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition",
                status === s
                  ? statusBadge(s)
                  : "border-panel bg-card text-secondary hover:border-accent/30",
              ].join(" ")}
            >
              <input
                type="radio"
                name={`status-${record.id}`}
                value={s}
                checked={status === s}
                onChange={() => setStatus(s)}
                className="sr-only"
              />
              <span
                className={`h-3 w-3 shrink-0 rounded-full border-2 ${status === s ? "border-current bg-current" : "border-panel"}`}
                aria-hidden="true"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor={`notes-${record.id}`}
          className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary"
        >
          Verification Notes
        </label>
        <textarea
          id={`notes-${record.id}`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add verification notes, rejection reason, or required corrections..."
          className="w-full resize-none rounded-md border border-panel bg-panel px-3 py-2.5 text-xs text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-4 py-2 text-xs font-bold text-button transition hover:bg-accent-strong disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Decision"}
        </button>
        {saved && <span className="text-xs font-semibold text-success">✓ Saved</span>}
      </div>
    </div>
  )
}

// --- Bank record card ---------------------------------------------------------

function BankCard({
  record,
  onSaved,
}: {
  record: BankRecord
  onSaved: (id: number, status: VerificationStatus, notes: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`enterprise-card ${record.verification_status === "Verified" ? "!border-success/25" : record.verification_status === "Rejected" ? "!border-rose-500/20" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-heading">
              {record.business_name || record.account_holder || "Unknown Supplier"}
            </h3>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${statusBadge(record.verification_status)}`}>
              {record.verification_status ?? "Unverified"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {[record.industry, record.province].filter(Boolean).join(" · ") || "No profile details"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-panel"
          aria-expanded={expanded}
        >
          {expanded ? "Collapse" : "Review"}
        </button>
      </div>

      {/* Bank details summary */}
      <div className="mt-3 grid gap-2 rounded-md border border-panel bg-panel p-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Bank", value: record.bank_name },
          { label: "Account Holder", value: record.account_holder },
          { label: "Account Number", value: maskAccount(record.account_number) },
          { label: "Branch Code", value: record.branch_code },
          { label: "Account Type", value: record.account_type },
          { label: "Submitted", value: fmtDate(record.created_at) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-0.5 text-xs font-semibold text-heading">{value || "—"}</p>
          </div>
        ))}
      </div>

      {record.verification_notes && (
        <div className="mt-2 rounded-md border border-panel bg-surface px-4 py-2.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Current Notes</p>
          <p className="mt-0.5 text-xs text-secondary">{record.verification_notes}</p>
        </div>
      )}

      {expanded && <VerificationPanel record={record} onSaved={onSaved} />}
    </div>
  )
}

// --- Skeleton -----------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="enterprise-card space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-48 animate-pulse rounded bg-panel" />
          <div className="h-3 w-32 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-7 w-20 animate-pulse rounded-md bg-panel" />
      </div>
      <div className="h-20 animate-pulse rounded-md bg-panel" />
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default function AdminBankingPage() {
  const router = useRouter()
  const [records, setRecords] = useState<BankRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tableError, setTableError] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      if (!supabase) { setError("Supabase is not configured."); setLoading(false); return }

      const { data, error: fetchErr } = await supabase
        .from("supplier_bank_details")
        .select("id, supplier_id, bank_name, account_holder, account_number, branch_code, account_type, verification_status, verification_notes, created_at")
        .order("created_at", { ascending: false })

      if (fetchErr) {
        if (fetchErr.message.includes("does not exist") || fetchErr.message.includes("relation")) {
          setTableError(true)
        } else {
          setError(fetchErr.message)
        }
        setLoading(false)
        return
      }

      const rawRecords = (data ?? []) as BankRecord[]

      // Enrich with profile data
      const supplierIds = [...new Set(rawRecords.map((r) => r.supplier_id).filter(Boolean) as string[])]
      if (supplierIds.length > 0 && supabase) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, business_name, province, industry, verification_status")
          .in("id", supplierIds)

        if (profileData) {
          const profileMap = new Map((profileData as Array<{ id: string; business_name: string | null; province: string | null; industry: string | null; verification_status: string | null }>).map((p) => [p.id, p]))
          setRecords(rawRecords.map((r) => {
            const profile = r.supplier_id ? profileMap.get(r.supplier_id) : undefined
            return {
              ...r,
              business_name: profile?.business_name ?? null,
              province: profile?.province ?? null,
              industry: profile?.industry ?? null,
              profile_verification_status: profile?.verification_status ?? null,
            }
          }))
        } else {
          setRecords(rawRecords)
        }
      } else {
        setRecords(rawRecords)
      }

      setLoading(false)
    }
    load()
  }, [router])

  function handleRecordSaved(id: number, status: VerificationStatus, notes: string) {
    setRecords((prev) =>
      prev.map((r) => r.id === id ? { ...r, verification_status: status, verification_notes: notes || null } : r)
    )
  }

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !search ||
        (r.business_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.account_holder ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (r.bank_name ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "All" || r.verification_status === statusFilter
      return matchSearch && matchStatus
    })
  }, [records, search, statusFilter])

  const counts = useMemo(() => ({
    total: records.length,
    unverified: records.filter((r) => !r.verification_status || r.verification_status === "Unverified").length,
    underReview: records.filter((r) => r.verification_status === "Under Review").length,
    verified: records.filter((r) => r.verification_status === "Verified").length,
    rejected: records.filter((r) => r.verification_status === "Rejected").length,
  }), [records])

  return (
    <div>
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Finance</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Banking Details Review</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
          Review and verify supplier banking details before payments are released.
          Only suppliers with <strong>Verified</strong> banking status can receive payments.
        </p>
      </div>

      {/* Table missing */}
      {tableError && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">supplier_bank_details table not found.</p>
          <p className="mt-1 text-xs text-rose-700">
            Run the SQL migration from the Banking Details page, then refresh.
          </p>
        </div>
      )}

      {error && !tableError && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      {!loading && !error && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total", count: counts.total, cls: "text-heading" },
            { label: "Unverified", count: counts.unverified, cls: "text-warning" },
            { label: "Under Review", count: counts.underReview, cls: "text-sky-700" },
            { label: "Verified", count: counts.verified, cls: "text-success" },
            { label: "Rejected", count: counts.rejected, cls: "text-rose-600" },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-panel bg-card p-4 shadow-panel text-center">
              <p className={`text-2xl font-bold tabular-nums ${item.cls}`}>{item.count}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wider text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!loading && !error && records.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by supplier name, account holder, or bank…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-panel bg-panel pl-10 pr-4 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", ...VERIFICATION_STATUSES].map((s) => (
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
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No banking submissions yet</p>
          <p className="mt-1 text-xs text-muted">Supplier banking details will appear here once submitted.</p>
        </div>
      )}

      {!loading && filtered.length === 0 && records.length > 0 && (
        <div className="flex min-h-[140px] items-center justify-center rounded-md border border-panel bg-card shadow-panel">
          <p className="text-sm text-muted">No records match your filters.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((record) => (
            <BankCard key={record.id} record={record} onSaved={handleRecordSaved} />
          ))}
        </div>
      )}

      {!loading && records.length > 0 && (
        <p className="mt-5 text-center text-xs text-muted">
          Showing {filtered.length} of {records.length} supplier banking record{records.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
