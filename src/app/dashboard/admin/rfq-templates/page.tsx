"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { supabase } from "@/lib/supabase"

// ─── Constants ────────────────────────────────────────────────────────────────

export const TEMPLATE_APPLY_KEY = "monate-rfq-template-apply"

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
]

const CATEGORIES = [
  "Construction & Infrastructure", "Electrical & Engineering",
  "IT & Technology", "Mining & Resources", "Municipal Services",
  "Professional Services", "Supply & Logistics", "Water & Sanitation", "Other",
]

const DEFAULT_COMPLIANCE = `• Valid CSD registration report — current and matching trading name
• SARS tax compliance status PIN (verifiable at www.sars.gov.za)
• B-BBEE compliance certificate (original or certified copy) or sworn affidavit for EME/QSE
• CIPC company registration certificate
• Original bank-stamped account confirmation letter (not a statement)
• Declaration of interests and confirmation of no conflict of interest`

const DEFAULT_EVALUATION = `• Price / cost competitiveness (40%)
• B-BBEE status and transformation contribution (20%)
• Technical compliance and full scope understanding (25%)
• Relevant experience and verifiable reference projects (10%)
• Delivery timeline and operational readiness (5%)`

// ─── Types ────────────────────────────────────────────────────────────────────

export type RFQTemplate = {
  id: number
  created_by: string | null
  template_name: string | null
  category: string | null
  province: string | null
  title: string | null
  description: string | null
  compliance_requirements: string | null
  evaluation_criteria: string | null
  default_deadline_days: number | null
  created_at: string | null
}

type TemplateFormData = {
  template_name: string
  category: string
  province: string
  title: string
  description: string
  compliance_requirements: string
  evaluation_criteria: string
  default_deadline_days: number
}

const EMPTY_FORM: TemplateFormData = {
  template_name: "",
  category: "",
  province: "",
  title: "",
  description: "",
  compliance_requirements: DEFAULT_COMPLIANCE,
  evaluation_criteria: DEFAULT_EVALUATION,
  default_deadline_days: 14,
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelCls =
  "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.24em] text-secondary"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function categoryColor(cat: string | null): string {
  const map: Record<string, string> = {
    "Construction & Infrastructure": "border-warning/30 bg-warning/10 text-warning",
    "Electrical & Engineering": "border-sky-500/30 bg-sky-500/10 text-sky-700",
    "IT & Technology": "border-violet-500/30 bg-violet-500/10 text-violet-700",
    "Mining & Resources": "border-accent/30 bg-accent/10 text-accent-strong",
    "Professional Services": "border-success/30 bg-success/10 text-success",
    "Supply & Logistics": "border-orange-500/30 bg-orange-500/10 text-orange-700",
    "Water & Sanitation": "border-sky-500/30 bg-sky-500/10 text-sky-700",
    "Municipal Services": "border-rose-500/30 bg-rose-500/10 text-rose-700",
  }
  return map[cat ?? ""] ?? "border-panel bg-surface text-secondary"
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
  onDelete,
  deleting,
}: {
  template: RFQTemplate
  onUse: (t: RFQTemplate) => void
  onDelete: (id: number) => void
  deleting: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const days = template.default_deadline_days ?? 14

  return (
    <div className="enterprise-card flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-heading leading-snug">
              {template.template_name || "Unnamed Template"}
            </h3>
            {template.category && (
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${categoryColor(template.category)}`}>
                {template.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {[
              template.province,
              `${days} day${days !== 1 ? "s" : ""} deadline`,
              template.created_at ? `Created ${formatDate(template.created_at)}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onUse(template)}
            className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3.5 py-2 text-xs font-bold text-success transition hover:bg-success/20"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Use Template
          </button>
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            disabled={deleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-panel bg-surface text-muted transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Delete template"
            title="Delete template"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Title preview */}
      {template.title && (
        <p className="rounded-md border border-panel bg-surface px-3 py-2 text-xs leading-relaxed text-secondary">
          <span className="font-bold text-muted">Title: </span>{template.title}
        </p>
      )}

      {/* Expandable details */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-left text-[0.68rem] font-semibold text-accent transition hover:text-accent-strong"
        aria-expanded={expanded}
      >
        <svg className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {expanded ? "Hide details" : "View compliance & evaluation details"}
      </button>

      {expanded && (
        <div className="space-y-3 rounded-md border border-panel bg-surface p-4">
          {template.description && (
            <div>
              <p className="mb-1 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Description</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-secondary line-clamp-4">
                {template.description}
              </p>
            </div>
          )}
          {template.compliance_requirements && (
            <div>
              <p className="mb-1 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Compliance Requirements</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-secondary">
                {template.compliance_requirements}
              </p>
            </div>
          )}
          {template.evaluation_criteria && (
            <div>
              <p className="mb-1 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">Evaluation Criteria</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-secondary">
                {template.evaluation_criteria}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateTemplateForm({
  onCreated,
  userId,
}: {
  onCreated: (t: RFQTemplate) => void
  userId: string
}) {
  const [form, setForm] = useState<TemplateFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.type === "number" ? Number(e.target.value) : e.target.value }))
    setError("")
    setSuccess(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)

    if (!form.template_name.trim()) {
      setError("Template name is required.")
      return
    }
    if (!supabase) {
      setError("Supabase is not configured.")
      return
    }

    setSaving(true)
    const { data, error: insertErr } = await supabase
      .from("rfq_templates")
      .insert([{
        created_by: userId,
        template_name: form.template_name.trim(),
        category: form.category || null,
        province: form.province || null,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        compliance_requirements: form.compliance_requirements.trim() || null,
        evaluation_criteria: form.evaluation_criteria.trim() || null,
        default_deadline_days: form.default_deadline_days || 14,
      }])
      .select("*")
      .single()

    setSaving(false)

    if (insertErr) {
      if (insertErr.message.includes("does not exist") || insertErr.message.includes("relation")) {
        setError("rfq_templates table not found. Run the provided SQL migration in your Supabase dashboard first.")
      } else {
        setError(insertErr.message)
      }
      return
    }

    try {
      await logActivity({
        action: "rfq_template.created",
        entity_type: "rfq_template",
        entity_id: data?.id ?? null,
        metadata: { template_name: form.template_name, category: form.category },
      })
    } catch { /* swallow */ }

    onCreated(data as RFQTemplate)
    setForm(EMPTY_FORM)
    setSuccess(true)
  }

  return (
    <form onSubmit={handleSave} className="enterprise-card">
      <div className="mb-5 border-b border-panel pb-4">
        <p className="enterprise-section-label">New Template</p>
        <h3 className="text-base font-bold text-heading">
          Create RFQ Template
        </h3>
        <p className="mt-1 text-xs text-secondary">
          Save reusable RFQ structures. Apply them to new RFQs with one click.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md border border-success/30 bg-success-soft px-4 py-3">
          <p className="text-sm font-semibold text-success">Template saved successfully.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Template name — required */}
        <div>
          <label htmlFor="template_name" className={labelCls}>
            Template Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="template_name"
            name="template_name"
            type="text"
            placeholder='e.g. "Standard Construction RFQ – Gauteng"'
            value={form.template_name}
            onChange={change}
            required
            className={inputCls}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className={labelCls}>Category</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={change}
              className={inputCls}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="province" className={labelCls}>Target Province</label>
            <select
              id="province"
              name="province"
              value={form.province}
              onChange={change}
              className={inputCls}
            >
              <option value="">All provinces</option>
              {SA_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="title" className={labelCls}>Default RFQ Title</label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder='e.g. "Supply and Installation of Solar Panels – Limpopo"'
            value={form.title}
            onChange={change}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelCls}>Description / Scope Template</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Standard scope text that will pre-fill the RFQ description field..."
            value={form.description}
            onChange={change}
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="compliance_requirements" className={labelCls}>
              Compliance Requirements
            </label>
            <textarea
              id="compliance_requirements"
              name="compliance_requirements"
              rows={7}
              value={form.compliance_requirements}
              onChange={change}
              className={`${inputCls} resize-y`}
            />
          </div>
          <div>
            <label htmlFor="evaluation_criteria" className={labelCls}>
              Evaluation Criteria
            </label>
            <textarea
              id="evaluation_criteria"
              name="evaluation_criteria"
              rows={7}
              value={form.evaluation_criteria}
              onChange={change}
              className={`${inputCls} resize-y`}
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label htmlFor="default_deadline_days" className={labelCls}>
            Default Deadline Window (days)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="default_deadline_days"
              name="default_deadline_days"
              type="number"
              min={7}
              max={90}
              value={form.default_deadline_days}
              onChange={change}
              className={`${inputCls} w-24`}
            />
            <span className="text-sm text-secondary">calendar days from publication</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                </svg>
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="enterprise-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-48 animate-pulse rounded bg-panel" />
          <div className="h-3 w-32 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-md bg-panel" />
      </div>
      <div className="h-9 animate-pulse rounded-md bg-panel" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RFQTemplatesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [templates, setTemplates] = useState<RFQTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState<Set<number>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [justUsed, setJustUsed] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) {
        setAccessDenied(true)
        setLoading(false)
        return
      }
      setUserId(profile.id)

      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data, error: fetchErr } = await supabase
        .from("rfq_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchErr) {
        if (fetchErr.message.includes("does not exist") || fetchErr.message.includes("relation")) {
          setError("rfq_templates table not found. Run the SQL migration below in your Supabase SQL Editor.")
        } else {
          setError(fetchErr.message)
        }
        setLoading(false)
        return
      }

      setTemplates((data ?? []) as RFQTemplate[])
      setLoading(false)
    }
    load()
  }, [])

  function handleTemplateCreated(t: RFQTemplate) {
    setTemplates((prev) => [t, ...prev])
    setShowForm(false)
  }

  function handleUseTemplate(template: RFQTemplate) {
    localStorage.setItem(TEMPLATE_APPLY_KEY, JSON.stringify(template))
    setJustUsed(template.id)
    setTimeout(() => {
      router.push("/dashboard/admin/rfqs/new")
    }, 350)
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this template? This cannot be undone.")) return
    if (!supabase) return
    setDeleting((prev) => new Set(prev).add(id))
    const { error: delErr } = await supabase.from("rfq_templates").delete().eq("id", id)
    setDeleting((prev) => { const next = new Set(prev); next.delete(id); return next })
    if (delErr) { setError(delErr.message); return }
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    try {
      await logActivity({
        action: "rfq_template.deleted",
        entity_type: "rfq_template",
        entity_id: id,
        metadata: {},
      })
    } catch { /* swallow */ }
  }

  const filtered = templates.filter((t) => {
    const matchSearch =
      !search ||
      (t.template_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category ?? "").toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCategory || t.category === filterCategory
    return matchSearch && matchCat
  })

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl rounded-md border border-rose-500/25 bg-rose-500/10 p-8">
        <p className="text-sm font-bold text-rose-700">Access restricted</p>
        <p className="mt-2 text-sm text-rose-700">
          RFQ Templates are available to admin and buyer users only.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Admin / Procurement
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            RFQ Templates
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
            Create and manage reusable RFQ templates. Apply any template to a new
            RFQ with one click to pre-fill title, description, compliance
            requirements, and evaluation criteria.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={[
            "inline-flex shrink-0 items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition",
            showForm
              ? "border-panel bg-panel text-secondary hover:bg-surface"
              : "border-accent bg-accent text-button hover:bg-accent-strong",
          ].join(" ")}
        >
          {showForm ? (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Template
            </>
          )}
        </button>
      </div>

      {/* SQL migration notice */}
      {error.includes("rfq_templates") && (
        <div className="mb-6 rounded-md border border-accent/25 bg-accent/5 p-5">
          <p className="text-sm font-bold text-accent">Database migration required</p>
          <p className="mt-1 text-xs text-secondary">
            Run the following SQL in your Supabase dashboard → SQL Editor, then refresh.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-heading/5 p-4 font-mono text-[0.68rem] leading-relaxed text-secondary whitespace-pre-wrap">
{`create table if not exists rfq_templates (
  id bigint generated always as identity primary key,
  created_by uuid,
  template_name text,
  category text,
  province text,
  title text,
  description text,
  compliance_requirements text,
  evaluation_criteria text,
  default_deadline_days integer,
  created_at timestamptz default timezone('utc', now())
);

alter table rfq_templates enable row level security;

create policy "Read RFQ templates" on rfq_templates
  for select using (true);
create policy "Insert RFQ templates" on rfq_templates
  for insert with check (true);
create policy "Update RFQ templates" on rfq_templates
  for update using (true);
create policy "Delete RFQ templates" on rfq_templates
  for delete using (true);`}
          </pre>
        </div>
      )}

      {/* General error */}
      {error && !error.includes("rfq_templates") && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-8">
          <CreateTemplateForm onCreated={handleTemplateCreated} userId={userId} />
        </div>
      )}

      {/* Filter bar */}
      {!loading && !error && templates.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} pl-10`}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`${inputCls} sm:w-56`}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && templates.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No templates yet</p>
          <p className="mt-1 text-xs text-muted">
            Create your first template to speed up RFQ creation.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Create First Template
          </button>
        </div>
      )}

      {/* No results */}
      {!loading && !error && templates.length > 0 && filtered.length === 0 && (
        <div className="flex min-h-[140px] items-center justify-center rounded-md border border-panel bg-card shadow-panel">
          <p className="text-sm text-muted">No templates match your search.</p>
        </div>
      )}

      {/* Template grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((template) => (
            <div key={template.id} className="relative">
              {justUsed === template.id && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-success/10 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 rounded-md border border-success bg-success-soft px-5 py-3 shadow-panel">
                    <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm font-bold text-success">Redirecting to new RFQ…</span>
                  </div>
                </div>
              )}
              <TemplateCard
                template={template}
                onUse={handleUseTemplate}
                onDelete={handleDelete}
                deleting={deleting.has(template.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && templates.length > 0 && (
        <p className="mt-5 text-center text-xs text-muted">
          {filtered.length} of {templates.length} template{templates.length !== 1 ? "s" : ""}
          {filterCategory || search ? " match your filters" : ""}
        </p>
      )}
    </div>
  )
}
