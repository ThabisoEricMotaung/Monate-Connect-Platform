"use client"

/*
 * ─── delegation_authority SQL migration ───────────────────────────────────────
 *
 * create table if not exists delegation_authority (
 *   id bigint generated always as identity primary key,
 *
 *   user_id uuid,
 *   user_email text,
 *   role text,
 *
 *   authority_area text,
 *   min_value numeric,
 *   max_value numeric,
 *
 *   can_approve_rfqs boolean default false,
 *   can_approve_awards boolean default false,
 *   can_approve_contracts boolean default false,
 *   can_approve_invoices boolean default false,
 *   can_approve_payments boolean default false,
 *   can_approve_overrides boolean default false,
 *
 *   is_active boolean default true,
 *
 *   created_at timestamptz default timezone('utc', now())
 * );
 *
 * alter table delegation_authority enable row level security;
 *
 * create policy "Read delegation authority"
 * on delegation_authority
 * for select
 * using (true);
 *
 * create policy "Insert delegation authority"
 * on delegation_authority
 * for insert
 * with check (true);
 *
 * create policy "Update delegation authority"
 * on delegation_authority
 * for update
 * using (true);
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  getDelegationAuthority,
  createDelegationRecord,
  updateDelegationRecord,
  AUTHORITY_AREAS,
  APPROVAL_ROLES,
  type DelegationAuthority,
  type CreateDelegationAuthorityInput,
} from "@/lib/delegationAuthority"
import { supabase } from "@/lib/supabase"

// ─── Constants ────────────────────────────────────────────────────────────────

const MIGRATION_SQL = `create table if not exists delegation_authority (
  id bigint generated always as identity primary key,

  user_id uuid,
  user_email text,
  role text,

  authority_area text,
  min_value numeric,
  max_value numeric,

  can_approve_rfqs boolean default false,
  can_approve_awards boolean default false,
  can_approve_contracts boolean default false,
  can_approve_invoices boolean default false,
  can_approve_payments boolean default false,
  can_approve_overrides boolean default false,

  is_active boolean default true,

  created_at timestamptz default timezone('utc', now())
);

alter table delegation_authority enable row level security;

create policy "Read delegation authority"
on delegation_authority
for select
using (true);

create policy "Insert delegation authority"
on delegation_authority
for insert
with check (true);

create policy "Update delegation authority"
on delegation_authority
for update
using (true);`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(v: number | null): string {
  if (v === null || v === undefined) return "—"
  return `R${v.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function authorityAreaLabel(type: string | null): string {
  return AUTHORITY_AREAS.find((e) => e.value === type)?.label ?? (type ?? "—")
}

function roleLabel(role: string | null): string {
  return APPROVAL_ROLES.find((r) => r.value === role)?.label ?? (role ?? "—")
}

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

const labelCls =
  "mb-1.5 block text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary"

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
          <p className="text-sm font-semibold text-accent">Database migration required — delegation_authority</p>
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

// ─── Delegation Form ──────────────────────────────────────────────────────────

const EMPTY_FORM: CreateDelegationAuthorityInput = {
  user_id: null,
  user_email: "",
  role: "",
  authority_area: "",
  min_value: null,
  max_value: null,
  can_approve_rfqs: false,
  can_approve_awards: false,
  can_approve_contracts: false,
  can_approve_invoices: false,
  can_approve_payments: false,
  can_approve_overrides: false,
  is_active: true,
}

function DelegationForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<CreateDelegationAuthorityInput> & { id?: number }
  onSave: (data: CreateDelegationAuthorityInput, id?: number) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<CreateDelegationAuthorityInput>({ ...EMPTY_FORM, ...initial })

  function change(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, type, value } = e.target
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox"
        ? checked
        : (name === "min_value" || name === "max_value")
          ? (value === "" ? null : Number(value))
          : value,
    }))
  }

  return (
    <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="mb-5 border-b border-panel pb-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-accent">Delegation Builder</p>
        <h3 className="mt-1 text-base font-bold text-heading">
          {initial?.id ? `Editing: ${initial.user_email}` : "Create Delegation Record"}
        </h3>
        <p className="mt-1 text-xs text-secondary">
          Define which users or roles have authority to approve procurement actions within specific value ranges.
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="user_email" className={labelCls}>
            User Email <span className="text-rose-500">*</span>
          </label>
          <input id="user_email" name="user_email" type="email"
            placeholder="user@example.com"
            value={form.user_email ?? ""} onChange={change} className={inputCls} required />
          <p className="mt-1.5 text-xs text-muted">Must be an existing user in the system.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="role" className={labelCls}>
              Role <span className="text-rose-500">*</span>
            </label>
            <select id="role" name="role" value={form.role ?? ""} onChange={change} className={inputCls} required>
              <option value="">Select role</option>
              {APPROVAL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="authority_area" className={labelCls}>
              Authority Area <span className="text-rose-500">*</span>
            </label>
            <select id="authority_area" name="authority_area" value={form.authority_area ?? ""} onChange={change} className={inputCls} required>
              <option value="">Select authority area</option>
              {AUTHORITY_AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className={`${labelCls} mb-2`}>Value Range (ZAR)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="min_value" className="mb-1 block text-xs text-secondary">Minimum Value (R)</label>
              <div className="flex items-center gap-2">
                <span className="flex h-[42px] items-center rounded-l-md border border-r-0 border-panel bg-muted px-3 text-sm font-bold text-secondary">R</span>
                <input id="min_value" name="min_value" type="number" min={0} step={1000}
                  placeholder="0 (or leave blank)"
                  value={form.min_value ?? ""} onChange={change}
                  className={`${inputCls} rounded-l-none`} />
              </div>
            </div>
            <div>
              <label htmlFor="max_value" className="mb-1 block text-xs text-secondary">Maximum Value (R)</label>
              <div className="flex items-center gap-2">
                <span className="flex h-[42px] items-center rounded-l-md border border-r-0 border-panel bg-muted px-3 text-sm font-bold text-secondary">R</span>
                <input id="max_value" name="max_value" type="number" min={0} step={1000}
                  placeholder="No limit (leave blank)"
                  value={form.max_value ?? ""} onChange={change}
                  className={`${inputCls} rounded-l-none`} />
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted">Leave both blank to apply to any value.</p>
        </div>

        <div>
          <p className={`${labelCls} mb-2`}>Approval Permissions</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {AUTHORITY_AREAS.map((area) => (
              <div key={area.value} className="flex items-center gap-3">
                <input
                  id={`can_approve_${area.value}`}
                  name={`can_approve_${area.value}`}
                  type="checkbox"
                  checked={form[`can_approve_${area.value}` as keyof CreateDelegationAuthorityInput] as boolean ?? false}
                  onChange={change}
                  className="h-4 w-4 rounded border-panel accent-accent"
                />
                <label htmlFor={`can_approve_${area.value}`} className="cursor-pointer text-sm font-semibold text-heading">
                  Can approve {area.label.toLowerCase().replace(" approval", "")}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input id="is_active" name="is_active" type="checkbox"
            checked={form.is_active ?? true} onChange={change}
            className="h-4 w-4 rounded border-panel accent-accent" />
          <label htmlFor="is_active" className="cursor-pointer text-sm font-semibold text-heading">
            Record is active
          </label>
          <span className="text-xs text-muted">Inactive records are not evaluated.</span>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={saving || !form.user_email?.trim() || !form.role || !form.authority_area}
            onClick={() => onSave(form, initial?.id)}
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
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
                </svg>
                {initial?.id ? "Update Record" : "Create Record"}
              </>
            )}
          </button>
          <button type="button" onClick={onCancel}
            className="rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delegation Row ──────────────────────────────────────────────────────────

function DelegationRow({
  record,
  onEdit,
  onToggle,
  toggling,
}: {
  record: DelegationAuthority
  onEdit: (record: DelegationAuthority) => void
  onToggle: (id: number, active: boolean) => void
  toggling: boolean
}) {
  const approvalPermissions = useMemo(() => {
    const permissions: string[] = []
    if (record.can_approve_rfqs) permissions.push("RFQs")
    if (record.can_approve_awards) permissions.push("Awards")
    if (record.can_approve_contracts) permissions.push("Contracts")
    if (record.can_approve_invoices) permissions.push("Invoices")
    if (record.can_approve_payments) permissions.push("Payments")
    if (record.can_approve_overrides) permissions.push("Overrides")
    return permissions.length > 0 ? permissions.join(", ") : "None"
  }, [record])

  return (
    <tr className={`border-b border-panel transition hover:bg-surface/40 ${!record.is_active ? "opacity-55" : ""}`}>
      <td className="px-4 py-3.5">
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggle(record.id, !record.is_active)}
          className={[
            "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            record.is_active ? "border-accent bg-accent" : "border-panel bg-panel",
          ].join(" ")}
          aria-label={record.is_active ? "Disable record" : "Enable record"}
        >
          <span className={[
            "h-3.5 w-3.5 rounded-full bg-button shadow transition-transform",
            record.is_active ? "translate-x-[18px]" : "translate-x-[2px]",
          ].join(" ")} />
        </button>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-heading">{record.user_email ?? "—"}</p>
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex rounded-full border border-panel bg-surface px-2.5 py-0.5 text-[0.63rem] font-bold uppercase tracking-wider text-secondary">
          {roleLabel(record.role)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-xs text-secondary">{authorityAreaLabel(record.authority_area)}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-xs text-secondary">
          {fmtAmount(record.min_value)} – {fmtAmount(record.max_value)}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-xs text-secondary">{approvalPermissions}</p>
      </td>
      <td className="px-4 py-3.5">
        <button type="button" onClick={() => onEdit(record)}
          className="inline-flex items-center gap-1 rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DelegationAuthorityPage() {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)
  const [records, setRecords] = useState<DelegationAuthority[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DelegationAuthority | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [tableError, setTableError] = useState(false)

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      try {
        const data = await getDelegationAuthority()
        setRecords(data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Delegation authority failed to load."
        if (message.includes("does not exist") || message.includes("relation")) {
          setTableError(true)
        } else {
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleSave(data: CreateDelegationAuthorityInput, id?: number) {
    setSaving(true)
    setSaveSuccess("")
    setError("")
    try {
      if (id) {
        const updated = await updateDelegationRecord(id, data)
        if (updated) {
          setRecords((prev) => prev.map((r) => r.id === id ? updated : r))
          setSaveSuccess(`Delegation record for "${updated.user_email}" updated.`)
        } else {
          setError("Failed to update record.")
        }
      } else {
        // Before creating, try to get user_id from user_email
        if (!supabase) { setError("Supabase not configured."); setSaving(false); return }
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", data.user_email)
          .single()

        if (userError || !userData) {
          setError("User with this email not found. Please ensure the email is correct.")
          setSaving(false)
          return
        }
        const recordWithUserId = { ...data, user_id: userData.id }

        const created = await createDelegationRecord(recordWithUserId)
        if (created) {
          setRecords((prev) => [created, ...prev])
          setSaveSuccess(`Delegation record for "${created.user_email}" created.`)
        } else {
          setError("Failed to create record.")
        }
      }
      setShowForm(false)
      setEditingRecord(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delegation authority save failed.")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: number, active: boolean) {
    setTogglingId(id)
    try {
      const updated = await updateDelegationRecord(id, { is_active: active })
      if (updated) setRecords((prev) => prev.map((r) => r.id === id ? updated : r))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delegation authority update failed.")
    } finally {
      setTogglingId(null)
    }
  }

  function handleEdit(record: DelegationAuthority) {
    setEditingRecord(record)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Governance</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">Delegation of Authority</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
            Define which users or roles can approve procurement actions at different value thresholds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setEditingRecord(null) }}
          className={[
            "inline-flex shrink-0 items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition",
            showForm ? "border-panel bg-panel text-secondary hover:bg-surface" : "border-accent bg-accent text-button hover:bg-accent-strong",
          ].join(" ")}
        >
          {showForm ? "Cancel" : (<><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>New Record</>)}
        </button>
      </div>

      {tableError && <SQLBlock sql={MIGRATION_SQL} />}

      {error && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="mb-5 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{saveSuccess}</p>
        </div>
      )}

      {/* Rule form */}
      <div ref={formRef}>
        {showForm && (
          <div className="mb-8">
            <DelegationForm
              initial={editingRecord ? {
                id: editingRecord.id,
                user_id: editingRecord.user_id ?? null,
                user_email: editingRecord.user_email ?? "",
                role: editingRecord.role ?? "",
                authority_area: editingRecord.authority_area ?? "",
                min_value: editingRecord.min_value,
                max_value: editingRecord.max_value,
                can_approve_rfqs: editingRecord.can_approve_rfqs ?? false,
                can_approve_awards: editingRecord.can_approve_awards ?? false,
                can_approve_contracts: editingRecord.can_approve_contracts ?? false,
                can_approve_invoices: editingRecord.can_approve_invoices ?? false,
                can_approve_payments: editingRecord.can_approve_payments ?? false,
                can_approve_overrides: editingRecord.can_approve_overrides ?? false,
                is_active: editingRecord.is_active ?? true,
              } : undefined}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingRecord(null) }}
              saving={saving}
            />
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md border border-panel bg-card" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No delegation records</p>
          <p className="mt-1 text-xs text-muted">Create your first record to define approval authorities.</p>
        </div>
      )}

      {/* Records table */}
      {!loading && records.length > 0 && (
        <div className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {["Active", "User Email", "Role", "Authority Area", "Value Range", "Permissions", ""].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-left text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <DelegationRow
                    key={record.id}
                    record={record}
                    onEdit={handleEdit}
                    onToggle={handleToggle}
                    toggling={togglingId === record.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-panel px-5 py-3">
            <p className="text-xs text-muted">
              {records.length} record{records.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
