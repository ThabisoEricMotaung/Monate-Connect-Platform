"use client"

/*
 * ─── supplier_bank_details SQL migration ──────────────────────────────────────
 *
 * create table if not exists supplier_bank_details (
 *   id bigint generated always as identity primary key,
 *   supplier_id uuid,
 *   bank_name text,
 *   account_holder text,
 *   account_number text,
 *   branch_code text,
 *   account_type text,
 *   verification_status text default 'Unverified',
 *   verification_notes text,
 *   created_at timestamptz default timezone('utc', now())
 * );
 * alter table supplier_bank_details enable row level security;
 * create policy "Read supplier bank details" on supplier_bank_details for select using (true);
 * create policy "Insert supplier bank details" on supplier_bank_details for insert with check (true);
 * create policy "Update supplier bank details" on supplier_bank_details for update using (true);
 */

import { useEffect, useMemo, useState } from "react"
import { useAutosave } from "@/hooks/useAutosave"
import { logActivity } from "@/lib/activity"
import { supabase } from "@/lib/supabase"

// ─── Constants ────────────────────────────────────────────────────────────────

const SA_BANKS = [
  "ABSA",
  "First National Bank (FNB)",
  "Standard Bank",
  "Nedbank",
  "Capitec Bank",
  "African Bank",
  "Investec",
  "Discovery Bank",
  "Bidvest Bank",
  "TymeBank",
  "Bank Zero",
  "Other",
]

const ACCOUNT_TYPES = [
  "Current / Cheque Account",
  "Savings Account",
  "Transmission Account",
]

const MIGRATION_SQL = `create table if not exists supplier_bank_details (
  id bigint generated always as identity primary key,
  supplier_id uuid,
  bank_name text,
  account_holder text,
  account_number text,
  branch_code text,
  account_type text,
  verification_status text default 'Unverified',
  verification_notes text,
  created_at timestamptz default timezone('utc', now())
);
alter table supplier_bank_details enable row level security;
create policy "Read supplier bank details" on supplier_bank_details for select using (true);
create policy "Insert supplier bank details" on supplier_bank_details for insert with check (true);
create policy "Update supplier bank details" on supplier_bank_details for update using (true);`

// ─── Types ────────────────────────────────────────────────────────────────────

type BankForm = {
  bank_name: string
  account_holder: string
  account_number: string
  branch_code: string
  account_type: string
}

const EMPTY_FORM: BankForm = {
  bank_name: "",
  account_holder: "",
  account_number: "",
  branch_code: "",
  account_type: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function verificationBadge(status: string | null): string {
  switch (status) {
    case "Verified":     return "border-success/40 bg-success/10 text-success"
    case "Under Review": return "border-sky-500/35 bg-sky-500/10 text-sky-700"
    case "Rejected":     return "border-rose-500/35 bg-rose-500/10 text-rose-700"
    default:             return "border-warning/40 bg-warning/10 text-warning"
  }
}

const inputCls =
  "w-full rounded-md border border-panel bg-panel px-4 py-3 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

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
          <p className="text-sm font-semibold text-accent">Database migration required — supplier_bank_details</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankingDetailsPage() {
  const [userId, setUserId] = useState("")
  const [dbId, setDbId] = useState<number | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<string | null>("Unverified")
  const [verificationNotes, setVerificationNotes] = useState<string | null>(null)
  const [form, setForm] = useState<BankForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [tableError, setTableError] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const autosave = useAutosave<BankForm>({
    key: "monate-draft-banking-details",
    value: form,
    enabled: !loading && !submitted,
    onRestore: setForm,
  })

  useEffect(() => {
    async function load() {
      if (!supabase) { setError("Supabase is not configured."); setLoading(false); return }

      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) { setError("You must be signed in."); setLoading(false); return }

      setUserId(user.id)

      const { data, error: fetchErr } = await supabase
        .from("supplier_bank_details")
        .select("id, bank_name, account_holder, account_number, branch_code, account_type, verification_status, verification_notes")
        .eq("supplier_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchErr) {
        if (fetchErr.message.includes("does not exist") || fetchErr.message.includes("relation")) {
          setTableError(true)
        } else {
          setError(fetchErr.message)
        }
        setLoading(false)
        return
      }

      if (data) {
        setDbId(data.id as number)
        setVerificationStatus(data.verification_status as string ?? "Unverified")
        setVerificationNotes(data.verification_notes as string | null)
        setForm({
          bank_name: String(data.bank_name ?? ""),
          account_holder: String(data.account_holder ?? ""),
          account_number: String(data.account_number ?? ""),
          branch_code: String(data.branch_code ?? ""),
          account_type: String(data.account_type ?? ""),
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
    setSuccess("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bank_name.trim() || !form.account_holder.trim() || !form.account_number.trim()) {
      setError("Bank name, account holder, and account number are required.")
      return
    }
    if (!supabase || !userId) { setError("Not authenticated."); return }

    setSaving(true)
    setError("")
    setSuccess("")

    const payload = {
      supplier_id: userId,
      bank_name: form.bank_name.trim(),
      account_holder: form.account_holder.trim(),
      account_number: form.account_number.trim(),
      branch_code: form.branch_code.trim(),
      account_type: form.account_type,
      // Reset to Unverified when details are re-submitted
      verification_status: "Unverified",
    }

    if (dbId) {
      const { error: updateErr } = await supabase
        .from("supplier_bank_details")
        .update(payload)
        .eq("id", dbId)
      if (updateErr) {
        setSaving(false)
        setTableError(updateErr.message.includes("does not exist") || updateErr.message.includes("relation"))
        setError(updateErr.message)
        return
      }
      setVerificationStatus("Unverified")
      setVerificationNotes(null)
    } else {
      const { data, error: insertErr } = await supabase
        .from("supplier_bank_details")
        .insert([payload])
        .select("id")
        .single()
      if (insertErr) {
        setSaving(false)
        setTableError(insertErr.message.includes("does not exist") || insertErr.message.includes("relation"))
        setError(insertErr.message)
        return
      }
      setDbId((data as { id: number } | null)?.id ?? null)
      setVerificationStatus("Unverified")
    }

    setSaving(false)
    setSubmitted(true)
    autosave.clearDraft()
    setSuccess("Banking details saved. A finance administrator will verify your details before payment can be processed.")

    try {
      await logActivity({ action: "supplier.banking_details_submitted", entity_type: "supplier_profile", entity_id: userId, metadata: { bank_name: form.bank_name } })
    } catch { /* swallow */ }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-panel" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mb-4 h-14 animate-pulse rounded-md bg-panel" />)}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Supplier Finance</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Banking Details</h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-secondary">
          Submit your banking details for payment processing. Your details must be
          verified by a finance administrator before payments can be released.
        </p>
      </div>

      {tableError && <SQLBlock sql={MIGRATION_SQL} />}

      {error && !tableError && (
        <div className="mb-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{success}</p>
        </div>
      )}

      {/* Verification status banner */}
      {dbId && (
        <div className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-secondary">
                Verification Status
              </p>
              <p className="mt-1 text-base font-bold text-heading">
                {verificationStatus ?? "Unverified"}
              </p>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${verificationBadge(verificationStatus)}`}>
              {verificationStatus ?? "Unverified"}
            </span>
          </div>

          {verificationNotes && (
            <div className="mt-3 rounded-md border border-panel bg-panel px-4 py-3">
              <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">
                Verification Notes
              </p>
              <p className="mt-1 text-sm leading-relaxed text-secondary">{verificationNotes}</p>
            </div>
          )}

          {verificationStatus === "Verified" && (
            <div className="mt-3 flex items-center gap-2 text-xs text-success">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Your banking details are verified. Payments can be processed to this account.
            </div>
          )}

          {verificationStatus === "Unverified" && (
            <p className="mt-2 text-xs text-muted">
              Your details are awaiting finance review. Editing and resubmitting will reset to Unverified.
            </p>
          )}

          {verificationStatus === "Rejected" && (
            <p className="mt-2 text-xs text-rose-700">
              Your banking details were rejected. Review the notes above and resubmit with correct information.
            </p>
          )}
        </div>
      )}

      {/* Autosave */}
      {autosave.showRecoveryDialog && (
        <div className="mb-5 rounded-md border border-accent bg-surface p-5 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">Restore previous draft?</p>
              <p className="mt-1 text-xs text-secondary">Banking details draft found from your last session.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={autosave.restoreDraft} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong">Restore</button>
              <button type="button" onClick={autosave.discardDraft} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-surface">Discard</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-2.5 shadow-sm">
        <p className="text-xs font-semibold text-success">
          {autosave.status === "saved" ? "✓ Draft saved" : "Draft autosaves every 5 seconds"}
        </p>
        <button type="button" onClick={autosave.discardDraft} className="text-[0.68rem] font-semibold text-muted transition hover:text-secondary">
          Discard draft
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="mb-5 border-b border-panel pb-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-accent">Banking Information</p>
          <h2 className="mt-1 text-base font-bold text-heading">Submit Your Banking Details</h2>
          <p className="mt-1 text-sm text-secondary">
            Enter your banking details exactly as they appear on your bank statement or bank confirmation letter.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="bank_name" className={labelCls}>
              Bank Name <span className="text-rose-500">*</span>
            </label>
            <select id="bank_name" name="bank_name" value={form.bank_name} onChange={handleChange} className={inputCls} required>
              <option value="">Select bank</option>
              {SA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="account_holder" className={labelCls}>
              Account Holder Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="account_holder" name="account_holder" type="text"
              placeholder="Registered business or trading name — must match CIPC registration"
              value={form.account_holder} onChange={handleChange}
              className={inputCls} required
            />
            <p className="mt-1.5 text-xs text-muted">
              Must match the name on your CIPC registration and bank confirmation letter.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="account_number" className={labelCls}>
                Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="account_number" name="account_number" type="text"
                placeholder="e.g. 62123456789"
                value={form.account_number} onChange={handleChange}
                className={inputCls} required
              />
            </div>
            <div>
              <label htmlFor="branch_code" className={labelCls}>Branch Code</label>
              <input
                id="branch_code" name="branch_code" type="text"
                placeholder="e.g. 632005"
                value={form.branch_code} onChange={handleChange}
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-muted">
                Universal branch codes: ABSA 632005 · FNB 250655 · Standard Bank 051001 · Nedbank 198765 · Capitec 470010
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="account_type" className={labelCls}>Account Type</label>
            <select id="account_type" name="account_type" value={form.account_type} onChange={handleChange} className={inputCls}>
              <option value="">Select account type</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-md border border-warning/25 bg-warning/8 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-warning">
            <strong>Important:</strong> Submitting incorrect banking details may delay payment. Ensure details exactly match your original bank-stamped confirmation letter submitted during supplier verification.
            {dbId && " Editing and resubmitting will reset your verification status to Unverified."}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving || tableError}
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
                {dbId ? "Update Banking Details" : "Submit Banking Details"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
