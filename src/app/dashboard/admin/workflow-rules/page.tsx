"use client"

/*
 * ─── workflow_rules SQL migration ─────────────────────────────────────────────
 *
 * create table if not exists workflow_rules (
 *   id bigint generated always as identity primary key,
 *   rule_name text,
 *   rule_type text,
 *   entity_type text,
 *   condition_key text,
 *   condition_operator text,
 *   condition_value text,
 *   action_type text,
 *   action_value text,
 *   is_active boolean default true,
 *   created_at timestamptz default timezone('utc', now())
 * );
 * alter table workflow_rules enable row level security;
 * create policy "Read workflow rules" on workflow_rules for select using (true);
 * create policy "Insert workflow rules" on workflow_rules for insert with check (true);
 * create policy "Update workflow rules" on workflow_rules for update using (true);
 */

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import {
  getWorkflowRules,
  createWorkflowRule,
  updateWorkflowRule,
  ENTITY_TYPES,
  CONDITION_KEYS_BY_ENTITY,
  CONDITION_OPERATORS,
  ACTION_TYPES,
  SEED_RULES,
  type WorkflowRule,
  type CreateWorkflowRuleInput,
} from "@/lib/workflowRules"

// ─── Constants ────────────────────────────────────────────────────────────────

const MIGRATION_SQL = `create table if not exists workflow_rules (
  id bigint generated always as identity primary key,
  rule_name text,
  rule_type text,
  entity_type text,
  condition_key text,
  condition_operator text,
  condition_value text,
  action_type text,
  action_value text,
  is_active boolean default true,
  created_at timestamptz default timezone('utc', now())
);
alter table workflow_rules enable row level security;
create policy "Read workflow rules" on workflow_rules for select using (true);
create policy "Insert workflow rules" on workflow_rules for insert with check (true);
create policy "Update workflow rules" on workflow_rules for update using (true);`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function entityLabel(type: string | null): string {
  return ENTITY_TYPES.find((e) => e.value === type)?.label ?? (type ?? "—")
}

function conditionKeyLabel(entityType: string | null, key: string | null): string {
  if (!entityType || !key) return key ?? "—"
  return CONDITION_KEYS_BY_ENTITY[entityType]?.find((k) => k.value === key)?.label ?? key
}

function operatorLabel(op: string | null): string {
  return CONDITION_OPERATORS.find((o) => o.value === op)?.label ?? (op ?? "—")
}

function actionLabel(type: string | null): string {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? (type ?? "—")
}

function actionBadge(type: string | null): string {
  switch (type) {
    case "block":            return "border-rose-500/35 bg-rose-500/10 text-rose-700"
    case "require_approval": return "border-warning/40 bg-warning/10 text-warning"
    case "flag_risk":        return "border-rose-400/30 bg-rose-400/8 text-rose-600"
    case "create_alert":     return "border-sky-500/35 bg-sky-500/10 text-sky-700"
    default:                 return "border-panel bg-surface text-secondary"
  }
}

function actionIcon(type: string | null): string {
  switch (type) {
    case "block":            return "🚫"
    case "require_approval": return "📋"
    case "flag_risk":        return "⚠️"
    case "create_alert":     return "🔔"
    default:                 return "📌"
  }
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
          <p className="text-sm font-semibold text-accent">Database migration required — workflow_rules</p>
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

// ─── Rule logic preview ───────────────────────────────────────────────────────

function RulePreview({ form }: { form: Partial<CreateWorkflowRuleInput> }) {
  if (!form.entity_type || !form.condition_key || !form.condition_operator) return null
  const keyLabel = conditionKeyLabel(form.entity_type ?? null, form.condition_key ?? null)
  const opLabel = operatorLabel(form.condition_operator ?? null)
  const actionType = ACTION_TYPES.find((a) => a.value === form.action_type)
  return (
    <div className="rounded-md border border-accent/20 bg-accent/5 px-4 py-3">
      <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-accent">Rule Preview</p>
      <p className="mt-1.5 text-sm text-heading">
        When{" "}
        <span className="font-semibold text-accent">{entityLabel(form.entity_type ?? null)}</span>
        {" — "}
        <span className="font-semibold">{keyLabel}</span>
        {" "}
        <span className="font-mono text-xs font-bold">{opLabel}</span>
        {" "}
        <span className="font-semibold">{form.condition_value || "[value]"}</span>
        {" → "}
        <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-bold ${actionBadge(form.action_type ?? null)}`}>
          {actionIcon(form.action_type ?? null)} {actionLabel(form.action_type ?? null)}
        </span>
      </p>
      {actionType && (
        <p className="mt-1 text-xs text-muted">{actionType.description}</p>
      )}
    </div>
  )
}

// ─── Rule form ────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateWorkflowRuleInput = {
  rule_name: "",
  entity_type: "",
  condition_key: "",
  condition_operator: ">",
  condition_value: "",
  action_type: "block",
  action_value: "",
  is_active: true,
}

function RuleForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<CreateWorkflowRuleInput>
  onSave: (data: CreateWorkflowRuleInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<CreateWorkflowRuleInput>({ ...EMPTY_FORM, ...initial })

  function change(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const val = e.target.type === "checkbox"
      ? (e.target as HTMLInputElement).checked
      : e.target.value
    setForm((p) => ({ ...p, [e.target.name]: val }))
    // Reset condition_key when entity_type changes
    if (e.target.name === "entity_type") {
      setForm((p) => ({ ...p, entity_type: e.target.value, condition_key: "" }))
    }
  }

  const conditionKeys = CONDITION_KEYS_BY_ENTITY[form.entity_type] ?? []

  return (
    <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="mb-5 border-b border-panel pb-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-accent">Rule Builder</p>
        <h3 className="mt-1 text-base font-bold text-heading">
          {initial?.rule_name ? `Editing: ${initial.rule_name}` : "Create New Rule"}
        </h3>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="rule_name" className={labelCls}>
            Rule Name <span className="text-rose-500">*</span>
          </label>
          <input id="rule_name" name="rule_name" type="text"
            placeholder="e.g. Block payment without verified banking"
            value={form.rule_name} onChange={change} className={inputCls} required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="entity_type" className={labelCls}>Entity Type <span className="text-rose-500">*</span></label>
            <select id="entity_type" name="entity_type" value={form.entity_type} onChange={change} className={inputCls}>
              <option value="">Select entity</option>
              {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="condition_key" className={labelCls}>Condition Field <span className="text-rose-500">*</span></label>
            <select id="condition_key" name="condition_key" value={form.condition_key} onChange={change} className={inputCls}
              disabled={!form.entity_type}>
              <option value="">Select field</option>
              {conditionKeys.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            {form.condition_key && conditionKeys.find((k) => k.value === form.condition_key)?.hint && (
              <p className="mt-1 text-xs text-muted">
                {conditionKeys.find((k) => k.value === form.condition_key)?.hint}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="condition_operator" className={labelCls}>Operator <span className="text-rose-500">*</span></label>
            <select id="condition_operator" name="condition_operator" value={form.condition_operator} onChange={change} className={inputCls}>
              {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="condition_value" className={labelCls}>
              Condition Value
              {form.condition_operator !== "is_empty" && form.condition_operator !== "is_not_empty" && (
                <span className="text-rose-500"> *</span>
              )}
            </label>
            <input id="condition_value" name="condition_value" type="text"
              placeholder={form.condition_key?.toLowerCase().includes("amount") || form.condition_key?.toLowerCase().includes("score") ? "e.g. 500000" : "e.g. Critical"}
              value={form.condition_value} onChange={change}
              disabled={form.condition_operator === "is_empty" || form.condition_operator === "is_not_empty"}
              className={inputCls} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="action_type" className={labelCls}>Action Type <span className="text-rose-500">*</span></label>
            <select id="action_type" name="action_type" value={form.action_type} onChange={change} className={inputCls}>
              {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted">
              {ACTION_TYPES.find((a) => a.value === form.action_type)?.description}
            </p>
          </div>
          <div>
            <label htmlFor="action_value" className={labelCls}>Message / Action Note</label>
            <textarea id="action_value" name="action_value" rows={3}
              placeholder="Message shown to the user or logged when this rule fires..."
              value={form.action_value} onChange={change}
              className={`${inputCls} resize-y`} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input id="is_active" name="is_active" type="checkbox"
            checked={form.is_active ?? true}
            onChange={change}
            className="h-4 w-4 rounded border-panel accent-accent" />
          <label htmlFor="is_active" className="text-sm font-semibold text-heading cursor-pointer">
            Rule is active
          </label>
          <span className="text-xs text-muted">
            Inactive rules are saved but not evaluated.
          </span>
        </div>

        {/* Preview */}
        <RulePreview form={form} />

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={saving || !form.rule_name.trim() || !form.entity_type || !form.condition_key}
            onClick={() => onSave(form)}
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
                {initial?.rule_name ? "Update Rule" : "Create Rule"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Rule table row ───────────────────────────────────────────────────────────

function RuleRow({
  rule,
  onEdit,
  onToggle,
  toggling,
}: {
  rule: WorkflowRule
  onEdit: (rule: WorkflowRule) => void
  onToggle: (id: number, active: boolean) => void
  toggling: boolean
}) {
  return (
    <tr className={`border-b border-panel transition hover:bg-surface/40 ${!rule.is_active ? "opacity-60" : ""}`}>
      {/* Active toggle */}
      <td className="px-4 py-3.5">
        <button
          type="button"
          disabled={toggling}
          onClick={() => onToggle(rule.id, !rule.is_active)}
          className={[
            "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            rule.is_active
              ? "border-accent bg-accent"
              : "border-panel bg-panel",
          ].join(" ")}
          aria-label={rule.is_active ? "Disable rule" : "Enable rule"}
        >
          <span
            className={[
              "h-3.5 w-3.5 rounded-full bg-button shadow transition-transform",
              rule.is_active ? "translate-x-[18px]" : "translate-x-[2px]",
            ].join(" ")}
          />
        </button>
      </td>

      {/* Rule name */}
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-heading">{rule.rule_name ?? "—"}</p>
        {rule.action_value && (
          <p className="mt-0.5 max-w-[280px] truncate text-xs text-muted" title={rule.action_value}>
            {rule.action_value}
          </p>
        )}
      </td>

      {/* Entity type */}
      <td className="px-4 py-3.5">
        <span className="inline-flex rounded-full border border-panel bg-surface px-2.5 py-0.5 text-[0.63rem] font-bold uppercase tracking-wider text-secondary">
          {entityLabel(rule.entity_type)}
        </span>
      </td>

      {/* Condition */}
      <td className="px-4 py-3.5">
        <code className="text-xs text-heading">
          {conditionKeyLabel(rule.entity_type, rule.condition_key)}
          {" "}
          <span className="text-accent font-bold">{rule.condition_operator}</span>
          {" "}
          {rule.condition_value && rule.condition_operator !== "is_empty" && rule.condition_operator !== "is_not_empty"
            ? <span className="text-heading">{rule.condition_value}</span>
            : null}
        </code>
      </td>

      {/* Action */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.63rem] font-bold ${actionBadge(rule.action_type)}`}>
          {actionIcon(rule.action_type)} {actionLabel(rule.action_type)}
        </span>
      </td>

      {/* Created */}
      <td className="px-4 py-3.5 text-xs text-muted">{fmtDate(rule.created_at)}</td>

      {/* Edit */}
      <td className="px-4 py-3.5">
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="inline-flex items-center gap-1 rounded-md border border-panel bg-surface px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-accent hover:text-accent"
        >
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

export default function WorkflowRulesPage() {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement>(null)
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [saveSuccess, setSaveSuccess] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterAction, setFilterAction] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  useEffect(() => {
    async function load() {
      const profile = await requireAdminOrBuyer()
      if (!profile) { router.replace("/dashboard"); return }
      const data = await getWorkflowRules()
      setRules(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(data: CreateWorkflowRuleInput) {
    setSaving(true)
    setSaveSuccess("")

    if (editingRule) {
      const updated = await updateWorkflowRule(editingRule.id, data)
      if (updated) {
        setRules((prev) => prev.map((r) => r.id === editingRule.id ? updated : r))
        setSaveSuccess(`Rule "${updated.rule_name}" updated.`)
      } else {
        setError("Failed to update rule. Check that the workflow_rules table exists.")
      }
    } else {
      const created = await createWorkflowRule(data)
      if (created) {
        setRules((prev) => [created, ...prev])
        setSaveSuccess(`Rule "${created.rule_name}" created.`)
      } else {
        setError("Failed to create rule. Check that the workflow_rules table exists.")
      }
    }

    setSaving(false)
    setShowForm(false)
    setEditingRule(null)
  }

  async function handleToggle(id: number, active: boolean) {
    setTogglingId(id)
    const updated = await updateWorkflowRule(id, { is_active: active })
    if (updated) setRules((prev) => prev.map((r) => r.id === id ? updated : r))
    setTogglingId(null)
  }

  function handleEdit(rule: WorkflowRule) {
    setEditingRule(rule)
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingRule(null)
  }

  const filtered = rules.filter((r) => {
    if (filterType !== "all" && r.entity_type !== filterType) return false
    if (filterAction !== "all" && r.action_type !== filterAction) return false
    if (filterStatus === "active" && !r.is_active) return false
    if (filterStatus === "inactive" && r.is_active) return false
    return true
  })

  const summary = {
    total: rules.length,
    active: rules.filter((r) => r.is_active).length,
    inactive: rules.filter((r) => !r.is_active).length,
    blocking: rules.filter((r) => r.action_type === "block" && r.is_active).length,
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">Admin / Governance</p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">Workflow Rules Engine</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-secondary">
            Define and enforce procurement rules automatically — block non-compliant actions,
            require approvals, and flag risks across the full procurement lifecycle.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setEditingRule(null) }}
          className={[
            "inline-flex shrink-0 items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition",
            showForm
              ? "border-panel bg-panel text-secondary hover:bg-surface"
              : "border-accent bg-accent text-button hover:bg-accent-strong",
          ].join(" ")}
        >
          {showForm ? "Cancel" : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Rule
            </>
          )}
        </button>
      </div>

      <SQLBlock sql={MIGRATION_SQL} />

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

      {/* Summary */}
      {!loading && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Rules",      count: summary.total,    color: "text-heading" },
            { label: "Active Rules",     count: summary.active,   color: "text-success" },
            { label: "Inactive",         count: summary.inactive, color: "text-muted" },
            { label: "Blocking Rules",   count: summary.blocking, color: "text-rose-700" },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-panel bg-card p-4 shadow-panel text-center">
              <p className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.count}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wider text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Rule form */}
      <div ref={formRef}>
        {showForm && (
          <div className="mb-8">
            <RuleForm
              initial={editingRule ? {
                rule_name: editingRule.rule_name ?? "",
                entity_type: editingRule.entity_type ?? "",
                condition_key: editingRule.condition_key ?? "",
                condition_operator: editingRule.condition_operator ?? ">",
                condition_value: editingRule.condition_value ?? "",
                action_type: editingRule.action_type ?? "block",
                action_value: editingRule.action_value ?? "",
                is_active: editingRule.is_active ?? true,
              } : undefined}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          </div>
        )}
      </div>

      {/* Example rules callout */}
      {!loading && rules.length === 0 && (
        <div className="mb-6 rounded-md border border-accent/20 bg-accent/5 p-5">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-accent">Example Rules</p>
          <p className="mt-1 text-sm text-secondary">
            The system comes with {SEED_RULES.length} pre-defined example rules. Create them in your database to activate automatic enforcement.
          </p>
          <div className="mt-3 space-y-1.5">
            {SEED_RULES.map((r, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.58rem] font-bold ${actionBadge(r.action_type)}`}>
                  {actionIcon(r.action_type)} {actionLabel(r.action_type)}
                </span>
                <span className="text-secondary">{r.rule_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && rules.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-panel bg-panel px-3 py-2 text-xs text-heading outline-none transition focus:border-accent">
            <option value="all">All entity types</option>
            {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-md border border-panel bg-panel px-3 py-2 text-xs text-heading outline-none transition focus:border-accent">
            <option value="all">All actions</option>
            {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-panel bg-panel px-3 py-2 text-xs text-heading outline-none transition focus:border-accent">
            <option value="all">Active + Inactive</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border border-panel bg-card" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && rules.length === 0 && (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed border-panel bg-card shadow-panel">
          <svg className="h-10 w-10 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-heading">No workflow rules yet</p>
          <p className="mt-1 text-xs text-muted">Create your first rule to start enforcing procurement governance.</p>
        </div>
      )}

      {/* Rules table */}
      {!loading && rules.length > 0 && (
        <div className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          {filtered.length === 0 ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <p className="text-sm text-muted">No rules match the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-panel bg-panel">
                    {["Active", "Rule Name", "Entity Type", "Condition", "Action", "Created", ""].map((h) => (
                      <th key={h} className="px-4 py-3.5 text-left text-[0.63rem] font-bold uppercase tracking-[0.18em] text-secondary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rule) => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      onEdit={handleEdit}
                      onToggle={handleToggle}
                      toggling={togglingId === rule.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-panel px-5 py-3">
            <p className="text-xs text-muted">
              {filtered.length} of {rules.length} rule{rules.length !== 1 ? "s" : ""} shown
              · Rules are evaluated on every matching action across the procurement lifecycle
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
