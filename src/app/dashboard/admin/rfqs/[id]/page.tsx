"use client"

import Link from "next/link"
import SignedDocumentLink from "@/components/SignedDocumentLink"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string | null
  description: string | null
  province: string | null
  category: string | null
  budget: string | null
  deadline: string | null
  status: string | null
  attachment_url: string | null
  created_at?: string | null
  is_external_opportunity?: boolean | null
  source_name?: string | null
  original_source_url?: string | null
}

type EditForm = {
  title: string
  description: string
  province: string
  category: string
  budget: string
  deadline: string
}

const SA_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Mpumalanga",
  "Limpopo",
  "Eastern Cape",
  "Free State",
  "North West",
  "Northern Cape",
  "National",
]

const CATEGORIES = [
  "Mining & Resources",
  "Construction & Infrastructure",
  "IT & Technology",
  "Facilities & Cleaning",
  "Logistics & Transport",
  "Professional Services",
  "Manufacturing",
  "General",
  "Works",
  "Services",
  "Other",
]

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelClass = "mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function formatBudget(value: string | null): string {
  if (!value) return "Not disclosed"
  const numeric = Number(String(value).replace(/[^\d]/g, ""))
  if (!Number.isFinite(numeric) || numeric <= 0) return value

  return `R ${numeric.toLocaleString("en-ZA")}`
}

function statusClass(status: string | null): string {
  const value = String(status ?? "").toLowerCase()
  if (value === "draft") return "border-warning bg-warning-soft text-warning"
  if (value === "open") return "border-success bg-success-soft text-success"
  if (value.includes("award")) return "border-accent bg-accent/15 text-accent"

  return "border-panel bg-panel text-secondary"
}

export default function AdminRFQDetailPage() {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const isBuyerRoute = pathname?.startsWith("/dashboard/buyer/")
  const rfqBaseHref = isBuyerRoute ? "/dashboard/buyer/rfqs" : "/dashboard/admin/rfqs"
  const quotesHref = isBuyerRoute
    ? `/dashboard/buyer/quotes?rfq_id=${params.id}`
    : `/dashboard/admin/rfqs/${params.id}/quotes`

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveMessage, setSaveMessage] = useState("")

  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState("")

  const rfqSelect =
    "id, title, description, province, category, budget, deadline, status, attachment_url, created_at, is_external_opportunity, source_name, original_source_url"

  useEffect(() => {
    let cancelled = false

    async function loadRFQ() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("rfqs")
        .select(rfqSelect)
        .eq("id", Number(params.id))
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setRfq((data as RFQ | null) ?? null)
      setLoading(false)
    }

    loadRFQ()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router])

  function startEditing() {
    if (!rfq) return
    setForm({
      title: rfq.title ?? "",
      description: rfq.description ?? "",
      province: rfq.province ?? "",
      category: rfq.category ?? "",
      budget: rfq.budget ? String(rfq.budget).replace(/[^\d]/g, "") : "",
      deadline: toDateInputValue(rfq.deadline),
    })
    setSaveError("")
    setSaveMessage("")
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setForm(null)
    setSaveError("")
  }

  function updateForm<K extends keyof EditForm>(field: K, value: EditForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current))
  }

  async function saveChanges() {
    if (!supabase || !rfq || !form) return

    if (!form.title.trim()) {
      setSaveError("Title is required.")
      return
    }

    setSaving(true)
    setSaveError("")
    setSaveMessage("")

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      province: form.province || null,
      category: form.category || null,
      budget: form.budget ? form.budget.replace(/[^\d]/g, "") : null,
      deadline: form.deadline || null,
    }

    const { data, error } = await supabase
      .from("rfqs")
      .update(payload)
      .eq("id", rfq.id)
      .select(rfqSelect)
      .maybeSingle()

    setSaving(false)

    if (error) {
      setSaveError(error.message)
      return
    }

    setRfq((data as RFQ | null) ?? { ...rfq, ...payload })
    setEditing(false)
    setForm(null)
    setSaveMessage("Changes saved.")
  }

  async function publishRfq() {
    if (!supabase || !rfq) return
    setActionBusy(true)
    setActionError("")

    const { error } = await supabase.from("rfqs").update({ status: "open" }).eq("id", rfq.id)

    setActionBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    setRfq((current) => (current ? { ...current, status: "open" } : current))
  }

  async function discardRfq() {
    if (!supabase || !rfq) return
    if (!window.confirm("Discard this RFQ draft? This cannot be undone.")) return

    setActionBusy(true)
    setActionError("")

    const { error } = await supabase.from("rfqs").delete().eq("id", rfq.id)

    setActionBusy(false)

    if (error) {
      setActionError(error.message)
      return
    }

    router.push(rfqBaseHref)
  }

  const isDraft = String(rfq?.status ?? "").toLowerCase() === "draft"

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-panel pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Procurement &gt; RFQs &gt; RFQ-{params.id}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {rfq?.title ?? "RFQ detail"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Review the RFQ record, status, targeting, and attached procurement documents.
            {isDraft && " Edit any field before you publish or discard this draft."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
            >
              Edit
            </button>
          )}
          <Link
            href={quotesHref}
            className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            View quotes
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
      ) : errorMessage ? (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
          <p className="text-sm font-semibold text-rose-700">RFQ failed to load</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      ) : !rfq ? (
        <div className="rounded-md border border-panel bg-card p-12 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">RFQ not found.</p>
          <Link href={isBuyerRoute ? "/dashboard/buyer" : "/dashboard/admin"} className="mt-4 inline-flex text-sm font-semibold text-accent">
            Back to overview
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Scope
              </p>
              {editing ? (
                <div className="mt-3">
                  <label htmlFor="edit-title" className={labelClass}>Title</label>
                  <input
                    id="edit-title"
                    value={form?.title ?? ""}
                    onChange={(event) => updateForm("title", event.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : (
                <h2 className="mt-2 text-lg font-semibold text-heading">{rfq.title}</h2>
              )}
            </div>

            {editing ? (
              <div className="mt-5">
                <label htmlFor="edit-description" className={labelClass}>Description</label>
                <textarea
                  id="edit-description"
                  rows={12}
                  value={form?.description ?? ""}
                  onChange={(event) => updateForm("description", event.target.value)}
                  className={`${inputClass} min-h-[220px] resize-y whitespace-pre-wrap`}
                />
              </div>
            ) : (
              <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-secondary">
                {rfq.description || "No description has been captured yet."}
              </div>
            )}

            {rfq.is_external_opportunity && (
              <div className="mt-5 rounded-md border border-accent/30 bg-surface p-4 text-xs text-secondary">
                <p className="font-semibold text-heading">Externally-sourced opportunity</p>
                <p className="mt-1">Source: {rfq.source_name || "Unknown"}</p>
                {rfq.original_source_url && (
                  <a
                    href={rfq.original_source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex text-accent transition hover:text-accent-strong"
                  >
                    Open original listing &rarr;
                  </a>
                )}
              </div>
            )}

            {editing && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-panel pt-5">
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  Cancel
                </button>
                {saveError && <p className="text-xs font-semibold text-rose-700">{saveError}</p>}
              </div>
            )}
            {!editing && saveMessage && (
              <p className="mt-4 text-xs font-semibold text-success">{saveMessage}</p>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <span
                className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusClass(rfq.status)}`}
              >
                {rfq.status ?? "Unknown"}
              </span>

              {editing ? (
                <div className="mt-5 space-y-4 text-sm">
                  <div>
                    <label htmlFor="edit-category" className={labelClass}>Category</label>
                    <select
                      id="edit-category"
                      value={form?.category ?? ""}
                      onChange={(event) => updateForm("category", event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                      {form?.category && !CATEGORIES.includes(form.category) && (
                        <option value={form.category}>{form.category}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-province" className={labelClass}>Province</label>
                    <select
                      id="edit-province"
                      value={form?.province ?? ""}
                      onChange={(event) => updateForm("province", event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select province</option>
                      {SA_PROVINCES.map((province) => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                      {form?.province && !SA_PROVINCES.includes(form.province) && (
                        <option value={form.province}>{form.province}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="edit-budget" className={labelClass}>Budget (R)</label>
                    <input
                      id="edit-budget"
                      inputMode="numeric"
                      value={form?.budget ?? ""}
                      onChange={(event) => updateForm("budget", event.target.value.replace(/[^\d]/g, ""))}
                      placeholder="e.g. 250000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-deadline" className={labelClass}>Deadline</label>
                    <input
                      id="edit-deadline"
                      type="date"
                      value={form?.deadline ?? ""}
                      onChange={(event) => updateForm("deadline", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3 text-sm text-secondary">
                  <p><span className="font-semibold text-heading">Category:</span> {rfq.category || "-"}</p>
                  <p><span className="font-semibold text-heading">Province:</span> {rfq.province || "-"}</p>
                  <p><span className="font-semibold text-heading">Budget:</span> {formatBudget(rfq.budget)}</p>
                  <p><span className="font-semibold text-heading">Deadline:</span> {formatDate(rfq.deadline)}</p>
                  <p><span className="font-semibold text-heading">Created:</span> {formatDate(rfq.created_at)}</p>
                </div>
              )}

              {rfq.attachment_url && (
                <SignedDocumentLink value={rfq.attachment_url} bucket="rfq-documents" className="mt-5 inline-flex text-sm font-semibold text-accent transition hover:text-accent-strong">
                  Open attachment
                </SignedDocumentLink>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`${rfqBaseHref}/${rfq.id}/matching`}
                  className="inline-flex rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary transition hover:border-accent hover:text-accent"
                >
                  Notify matched suppliers
                </Link>
                <Link
                  href={rfqBaseHref}
                  className="inline-flex rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary transition hover:border-accent hover:text-accent"
                >
                  Back to RFQs
                </Link>
              </div>
            </section>

            {isDraft && !editing && (
              <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">Draft review</p>
                <p className="mt-2 text-sm text-secondary">
                  Publish this RFQ to make it visible to suppliers, or discard it if it's not a fit.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={publishRfq}
                    disabled={actionBusy}
                    className="rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-button transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionBusy ? "Working..." : "Publish RFQ"}
                  </button>
                  <button
                    type="button"
                    onClick={discardRfq}
                    disabled={actionBusy}
                    className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Discard draft
                  </button>
                </div>
                {actionError && <p className="mt-3 text-xs font-semibold text-rose-700">{actionError}</p>}
              </section>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
