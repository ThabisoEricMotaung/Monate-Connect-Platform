"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type PilotRequest = {
  id: number
  name: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  request_type: string | null
  province: string | null
  message: string | null
  status: string | null
  assigned_to: string | null
  follow_up_date: string | null
  internal_notes: string | null
  created_at: string | null
}

const STATUSES = ["New", "Contacted", "Demo Scheduled", "Proposal Sent", "Pilot Active", "Converted", "Closed"]

const QUICK_ACTIONS = [
  { label: "Mark Contacted", status: "Contacted" },
  { label: "Schedule Demo", status: "Demo Scheduled" },
  { label: "Mark Proposal Sent", status: "Proposal Sent" },
  { label: "Start Pilot", status: "Pilot Active" },
  { label: "Mark Converted", status: "Converted" },
  { label: "Close Request", status: "Closed" },
]

const PILOT_REQUESTS_SQL = `
create table if not exists pilot_requests (
  id bigint generated always as identity primary key,
  name text,
  organisation text,
  email text,
  phone text,
  request_type text,
  province text,
  message text,
  status text default 'New',
  created_at timestamptz default timezone('utc', now())
);

alter table pilot_requests enable row level security;

create policy "Insert pilot requests"
on pilot_requests
for insert
with check (true);

create policy "Read pilot requests"
on pilot_requests
for select
using (true);

create policy "Update pilot requests"
on pilot_requests
for update
using (true);

alter table pilot_requests
add column if not exists assigned_to text,
add column if not exists follow_up_date date,
add column if not exists internal_notes text;
`

const inputClass =
  "rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusClass(status: string | null): string {
  switch (status) {
    case "Converted": return "border-success/35 bg-success-soft text-success"
    case "Pilot Active": return "border-success/35 bg-success/10 text-success"
    case "Demo Scheduled": return "border-accent/35 bg-accent/10 text-accent"
    case "Proposal Sent": return "border-accent/35 bg-accent/10 text-accent"
    case "In Discussion": return "border-accent/35 bg-accent/10 text-accent"
    case "Contacted": return "border-warning/35 bg-warning/10 text-warning"
    case "Closed": return "border-panel bg-panel text-secondary"
    default: return "border-rose-500/30 bg-rose-500/10 text-rose-700"
  }
}

function uniqueOptions(values: Array<string | null>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b))
}

function SQLBlock() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function copySql() {
    navigator.clipboard.writeText(PILOT_REQUESTS_SQL.trim()).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="mb-5 rounded-md border border-accent/25 bg-accent/5">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left">
        <p className="text-sm font-semibold text-accent">Database SQL for pilot_requests</p>
        <span className="text-xs font-semibold text-secondary">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-accent/20">
          <div className="flex items-center justify-between px-5 py-2">
            <p className="text-xs text-secondary">Run this in Supabase SQL Editor if status updates fail due to RLS.</p>
            <button type="button" onClick={copySql} className="rounded border border-panel bg-surface px-3 py-1 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
              {copied ? "Copied" : "Copy SQL"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-b-md bg-heading/5 px-5 py-4 font-mono text-[0.68rem] leading-relaxed text-secondary">{PILOT_REQUESTS_SQL.trim()}</pre>
        </div>
      )}
    </div>
  )
}

export default function PilotRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<PilotRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")
  const [provinceFilter, setProvinceFilter] = useState("All")
  const [search, setSearch] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        router.replace("/dashboard")
        return
      }

      await loadRequests()
    }

    load()
  }, [router])

  async function loadRequests() {
    setError("")
    if (!supabase) {
      setError("Supabase is not configured.")
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from("pilot_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setRequests((data ?? []) as PilotRequest[])
    }
    setLoading(false)
  }

  async function updateRequest(id: number, patch: Partial<Pick<PilotRequest, "status" | "assigned_to" | "follow_up_date" | "internal_notes">>, message = "Pilot request updated.") {
    if (!supabase) return
    setUpdatingId(id)
    setError("")
    setSuccess("")

    const { data, error: updateError } = await supabase
      .from("pilot_requests")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single()

    setUpdatingId(null)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setRequests((current) => current.map((request) => request.id === id ? data as PilotRequest : request))
    setSuccess(message)
  }

  async function updateStatus(id: number, status: string) {
    await updateRequest(id, { status }, `Pilot request moved to ${status}.`)
  }

  function updateLocalField(id: number, field: "assigned_to" | "follow_up_date" | "internal_notes", value: string) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id
          ? { ...request, [field]: value || null }
          : request
      )
    )
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter((request) => {
      if (statusFilter !== "All" && (request.status || "New") !== statusFilter) return false
      if (typeFilter !== "All" && request.request_type !== typeFilter) return false
      if (provinceFilter !== "All" && request.province !== provinceFilter) return false
      if (query) {
        const haystack = [
          request.organisation,
          request.name,
          request.email,
        ].join(" ").toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [requests, statusFilter, typeFilter, provinceFilter, search])

  const summary = useMemo(() => ({
    new: requests.filter((request) => request.status === "New" || !request.status).length,
    demos: requests.filter((request) => request.status === "Demo Scheduled").length,
    active: requests.filter((request) => request.status === "Pilot Active").length,
    converted: requests.filter((request) => request.status === "Converted").length,
  }), [requests])

  const requestTypeOptions = useMemo(() => uniqueOptions(requests.map((request) => request.request_type)), [requests])
  const provinceOptions = useMemo(() => uniqueOptions(requests.map((request) => request.province)), [requests])

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Partnerships</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Pilot Requests</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
          Review public pilot demo, partnership, supplier onboarding and buyer setup requests.
        </p>
      </div>

      <SQLBlock />

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

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          ["New Requests", summary.new],
          ["Demos Scheduled", summary.demos],
          ["Active Pilots", summary.active],
          ["Converted Leads", summary.converted],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-heading">{Number(value).toLocaleString("en-ZA")}</p>
          </div>
        ))}
      </section>

      <section className="mb-5 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organisation, name, or email"
            className={inputClass}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
            <option value="All">All statuses</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={inputClass}>
            <option value="All">All request types</option>
            {requestTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select value={provinceFilter} onChange={(event) => setProvinceFilter(event.target.value)} className={inputClass}>
            <option value="All">All provinces</option>
            {provinceOptions.map((province) => <option key={province} value={province}>{province}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", ...STATUSES].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={[
                "rounded-md border px-3.5 py-2 text-xs font-semibold transition",
                statusFilter === status
                  ? "border-accent bg-accent text-button"
                  : "border-panel bg-panel text-secondary hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="h-80 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-panel bg-card p-12 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No pilot requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((request) => (
            <article key={request.id} className="rounded-md border border-panel bg-card p-6 shadow-panel">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
                    {request.request_type || "Pilot Request"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-heading">{request.name || "Unknown contact"}</h2>
                  <p className="mt-1 text-sm text-secondary">{request.organisation || "No organisation"} &middot; {request.province || "Province not specified"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] ${statusClass(request.status)}`}>
                    {request.status || "New"}
                  </span>
                  <select
                    value={request.status || "New"}
                    disabled={updatingId === request.id}
                    onChange={(event) => updateStatus(request.id, event.target.value)}
                    className={inputClass}
                  >
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    disabled={updatingId === request.id || request.status === action.status}
                    onClick={() => updateStatus(request.id, action.status)}
                    className="rounded-md border border-panel bg-panel px-3.5 py-2 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-panel bg-panel p-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Email</p>
                  <p className="mt-1 text-sm font-semibold text-heading">{request.email || "-"}</p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Phone</p>
                  <p className="mt-1 text-sm font-semibold text-heading">{request.phone || "-"}</p>
                </div>
                <div className="rounded-md border border-panel bg-panel p-3">
                  <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Received</p>
                  <p className="mt-1 text-sm font-semibold text-heading">{formatDate(request.created_at)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="block rounded-md border border-panel bg-panel p-3">
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Assigned To</span>
                  <input
                    value={request.assigned_to ?? ""}
                    onChange={(event) => updateLocalField(request.id, "assigned_to", event.target.value)}
                    onBlur={(event) => updateRequest(request.id, { assigned_to: event.target.value.trim() || null }, "Assigned owner updated.")}
                    className="mt-2 w-full rounded-md border border-panel bg-card px-3 py-2 text-sm text-heading outline-none transition focus:border-accent"
                    placeholder="Owner name or email"
                  />
                </label>
                <label className="block rounded-md border border-panel bg-panel p-3">
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Follow-up Date</span>
                  <input
                    type="date"
                    value={request.follow_up_date ?? ""}
                    onChange={(event) => updateLocalField(request.id, "follow_up_date", event.target.value)}
                    onBlur={(event) => updateRequest(request.id, { follow_up_date: event.target.value || null }, "Follow-up date updated.")}
                    className="mt-2 w-full rounded-md border border-panel bg-card px-3 py-2 text-sm text-heading outline-none transition focus:border-accent"
                  />
                </label>
                <label className="block rounded-md border border-panel bg-panel p-3 md:col-span-1">
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Internal Notes</span>
                  <textarea
                    rows={3}
                    value={request.internal_notes ?? ""}
                    onChange={(event) => updateLocalField(request.id, "internal_notes", event.target.value)}
                    onBlur={(event) => updateRequest(request.id, { internal_notes: event.target.value.trim() || null }, "Internal notes updated.")}
                    className="mt-2 w-full resize-none rounded-md border border-panel bg-card px-3 py-2 text-sm text-heading outline-none transition focus:border-accent"
                    placeholder="Private CRM notes"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-muted">Message</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-secondary">{request.message || "No message provided."}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
