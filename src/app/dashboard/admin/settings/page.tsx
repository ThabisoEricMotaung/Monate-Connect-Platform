"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type SettingValue = string | number | boolean

type SettingDefinition = {
  key: keyof SettingsState
  label: string
  category: SettingCategory
  description: string
  type: "number" | "boolean" | "select"
  options?: string[]
  min?: number
  max?: number
  step?: number
}

type SettingCategory =
  | "Procurement Rules"
  | "Supplier Verification"
  | "SmartScore Settings"
  | "Notification Settings"
  | "Finance Controls"
  | "Appearance & Accessibility Defaults"

type SettingsState = {
  default_rfq_deadline_days: number
  closing_soon_threshold_days: number
  allow_late_quotes: boolean
  require_rfq_attachments: boolean
  minimum_verification_status_for_awards: string
  require_banking_verification_for_payment: boolean
  require_tax_clearance: boolean
  require_bbbee: boolean
  require_csd: boolean
  verified_supplier_threshold: number
  elite_supplier_threshold: number
  high_risk_threshold: number
  score_visibility: boolean
  enable_whatsapp_drafts: boolean
  enable_in_app_notifications: boolean
  closing_soon_alerts: boolean
  compliance_expiry_alerts: boolean
  invoice_approval_alerts: boolean
  require_invoice_approval_before_payment: boolean
  require_verified_banking_before_payment: boolean
  default_vat_rate: number
  default_language: string
  default_theme: string
  high_contrast_default: boolean
  low_data_mode_default: boolean
}

type PlatformSettingRow = {
  setting_key: keyof SettingsState | string
  setting_value: unknown
  category: string | null
  description: string | null
  updated_at: string | null
}

const DEFAULT_SETTINGS: SettingsState = {
  default_rfq_deadline_days: 14,
  closing_soon_threshold_days: 3,
  allow_late_quotes: false,
  require_rfq_attachments: false,
  minimum_verification_status_for_awards: "Verified",
  require_banking_verification_for_payment: true,
  require_tax_clearance: true,
  require_bbbee: true,
  require_csd: true,
  verified_supplier_threshold: 750,
  elite_supplier_threshold: 850,
  high_risk_threshold: 399,
  score_visibility: true,
  enable_whatsapp_drafts: true,
  enable_in_app_notifications: true,
  closing_soon_alerts: true,
  compliance_expiry_alerts: true,
  invoice_approval_alerts: true,
  require_invoice_approval_before_payment: true,
  require_verified_banking_before_payment: true,
  default_vat_rate: 15,
  default_language: "English",
  default_theme: "System",
  high_contrast_default: false,
  low_data_mode_default: false,
}

const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "default_rfq_deadline_days",
    label: "Default RFQ deadline days",
    category: "Procurement Rules",
    description: "Default number of calendar days before a newly created RFQ closes.",
    type: "number",
    min: 1,
    max: 120,
  },
  {
    key: "closing_soon_threshold_days",
    label: "Closing soon threshold",
    category: "Procurement Rules",
    description: "Number of days before deadline when an RFQ is treated as closing soon.",
    type: "number",
    min: 1,
    max: 30,
  },
  {
    key: "allow_late_quotes",
    label: "Allow late quotes",
    category: "Procurement Rules",
    description: "Whether suppliers can submit quotes after the configured deadline.",
    type: "boolean",
  },
  {
    key: "require_rfq_attachments",
    label: "Require RFQ attachments",
    category: "Procurement Rules",
    description: "Require an attachment before a procurement team can publish an RFQ.",
    type: "boolean",
  },
  {
    key: "minimum_verification_status_for_awards",
    label: "Minimum verification status for awards",
    category: "Supplier Verification",
    description: "Supplier verification status required before an award can proceed.",
    type: "select",
    options: ["Pending Review", "Under Review", "Verified"],
  },
  {
    key: "require_banking_verification_for_payment",
    label: "Require banking verification for payment",
    category: "Supplier Verification",
    description: "Require verified banking details before supplier payment processing.",
    type: "boolean",
  },
  {
    key: "require_tax_clearance",
    label: "Require tax clearance",
    category: "Supplier Verification",
    description: "Require valid tax clearance documents for procurement readiness.",
    type: "boolean",
  },
  {
    key: "require_bbbee",
    label: "Require BBBEE",
    category: "Supplier Verification",
    description: "Require a BBBEE certificate or declaration for supplier verification.",
    type: "boolean",
  },
  {
    key: "require_csd",
    label: "Require CSD",
    category: "Supplier Verification",
    description: "Require Central Supplier Database registration evidence.",
    type: "boolean",
  },
  {
    key: "verified_supplier_threshold",
    label: "Verified supplier threshold",
    category: "SmartScore Settings",
    description: "SmartScore threshold used to classify suppliers as trusted or verified-ready.",
    type: "number",
    min: 0,
    max: 1000,
  },
  {
    key: "elite_supplier_threshold",
    label: "Elite supplier threshold",
    category: "SmartScore Settings",
    description: "SmartScore threshold used to classify elite suppliers.",
    type: "number",
    min: 0,
    max: 1000,
  },
  {
    key: "high_risk_threshold",
    label: "High risk threshold",
    category: "SmartScore Settings",
    description: "SmartScore value at or below which a supplier is considered high risk.",
    type: "number",
    min: 0,
    max: 1000,
  },
  {
    key: "score_visibility",
    label: "Score visibility",
    category: "SmartScore Settings",
    description: "Show SmartScore values to permitted dashboard users.",
    type: "boolean",
  },
  {
    key: "enable_whatsapp_drafts",
    label: "Enable WhatsApp drafts",
    category: "Notification Settings",
    description: "Allow automation to create WhatsApp-ready alert drafts.",
    type: "boolean",
  },
  {
    key: "enable_in_app_notifications",
    label: "Enable in-app notifications",
    category: "Notification Settings",
    description: "Allow automation to create dashboard notification records.",
    type: "boolean",
  },
  {
    key: "closing_soon_alerts",
    label: "Closing soon alerts",
    category: "Notification Settings",
    description: "Create alerts when RFQs approach their closing date.",
    type: "boolean",
  },
  {
    key: "compliance_expiry_alerts",
    label: "Compliance expiry alerts",
    category: "Notification Settings",
    description: "Create alerts when supplier compliance documents approach expiry.",
    type: "boolean",
  },
  {
    key: "invoice_approval_alerts",
    label: "Invoice approval alerts",
    category: "Notification Settings",
    description: "Create alerts when invoices are approved for payment processing.",
    type: "boolean",
  },
  {
    key: "require_invoice_approval_before_payment",
    label: "Require invoice approval before payment",
    category: "Finance Controls",
    description: "Prevent payment generation until the invoice approval gate is complete.",
    type: "boolean",
  },
  {
    key: "require_verified_banking_before_payment",
    label: "Require verified banking before payment",
    category: "Finance Controls",
    description: "Require supplier banking verification before payment processing.",
    type: "boolean",
  },
  {
    key: "default_vat_rate",
    label: "Default VAT rate",
    category: "Finance Controls",
    description: "Default VAT percentage used by finance workflows.",
    type: "number",
    min: 0,
    max: 100,
    step: 0.01,
  },
  {
    key: "default_language",
    label: "Default language",
    category: "Appearance & Accessibility Defaults",
    description: "Default language shown for platform users.",
    type: "select",
    options: ["English", "Afrikaans", "isiZulu", "isiXhosa", "Sepedi", "Setswana", "Sesotho", "Tshivenda", "Xitsonga"],
  },
  {
    key: "default_theme",
    label: "Default theme",
    category: "Appearance & Accessibility Defaults",
    description: "Default visual theme preference for new sessions.",
    type: "select",
    options: ["System", "Light", "Dark"],
  },
  {
    key: "high_contrast_default",
    label: "High contrast default",
    category: "Appearance & Accessibility Defaults",
    description: "Enable high-contrast presentation by default.",
    type: "boolean",
  },
  {
    key: "low_data_mode_default",
    label: "Low data mode default",
    category: "Appearance & Accessibility Defaults",
    description: "Prefer lower-bandwidth interface defaults for new sessions.",
    type: "boolean",
  },
]

const CATEGORIES: SettingCategory[] = [
  "Procurement Rules",
  "Supplier Verification",
  "SmartScore Settings",
  "Notification Settings",
  "Finance Controls",
  "Appearance & Accessibility Defaults",
]

const inputClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"

function isMissingSettingsTable(error: { message?: string; code?: string } | null): boolean {
  return Boolean(
    error?.code === "42P01" ||
      error?.code === "PGRST205" ||
      error?.message?.toLowerCase().includes("platform_settings") ||
      error?.message?.toLowerCase().includes("schema cache")
  )
}

function normalizeSettingValue(
  definition: SettingDefinition,
  value: unknown
): SettingValue {
  const fallback = DEFAULT_SETTINGS[definition.key]
  const rawValue =
    typeof value === "object" && value !== null && "value" in value
      ? (value as { value?: unknown }).value
      : value

  if (definition.type === "boolean") {
    return typeof rawValue === "boolean" ? rawValue : Boolean(fallback)
  }

  if (definition.type === "number") {
    const numericValue = Number(rawValue)
    return Number.isFinite(numericValue) ? numericValue : Number(fallback)
  }

  return typeof rawValue === "string" ? rawValue : String(fallback)
}

function formatUpdatedAt(dateStr: string | null): string {
  if (!dateStr) return "Not saved yet"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [savedRows, setSavedRows] = useState<Record<string, PlatformSettingRow>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [tableMissing, setTableMissing] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value, category, description, updated_at")
        .order("category", { ascending: true })

      if (error) {
        if (isMissingSettingsTable(error)) {
          setTableMissing(true)
          setErrorMessage("platform_settings table is not available. Run the SQL migration below, then reload this page.")
        } else {
          setErrorMessage(error.message)
        }
        setLoading(false)
        return
      }

      const rowMap = new Map(
        ((data ?? []) as PlatformSettingRow[]).map((row) => [
          row.setting_key,
          row,
        ])
      )
      const nextSettings = { ...DEFAULT_SETTINGS }

      for (const definition of SETTING_DEFINITIONS) {
        const row = rowMap.get(definition.key)
        if (row) {
          nextSettings[definition.key] = normalizeSettingValue(
            definition,
            row.setting_value
          ) as never
        }
      }

      setSettings(nextSettings)
      setSavedRows(Object.fromEntries(rowMap))
      setLoading(false)
    }

    loadSettings()
  }, [router])

  const groupedSettings = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        settings: SETTING_DEFINITIONS.filter((setting) => setting.category === category),
      })),
    []
  )

  const savedCount = useMemo(
    () => Object.keys(savedRows).length,
    [savedRows]
  )

  function updateSetting(key: keyof SettingsState, value: SettingValue) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))
    setSuccessMessage("")
  }

  async function saveSettings() {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    setSaving(true)
    setErrorMessage("")
    setSuccessMessage("")

    const rows = SETTING_DEFINITIONS.map((definition) => ({
      setting_key: definition.key,
      setting_value: { value: settings[definition.key] },
      category: definition.category,
      description: definition.description,
      updated_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "setting_key" })
      .select("setting_key, setting_value, category, description, updated_at")

    setSaving(false)

    if (error) {
      if (isMissingSettingsTable(error)) {
        setTableMissing(true)
        setErrorMessage("platform_settings table is not available. Run the SQL migration below, then reload this page.")
      } else {
        setErrorMessage(error.message)
      }
      return
    }

    const rowMap = new Map(
      ((data ?? []) as PlatformSettingRow[]).map((row) => [
        row.setting_key,
        row,
      ])
    )
    setSavedRows(Object.fromEntries(rowMap))
    setSuccessMessage("Platform settings saved successfully.")
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Governance
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Enterprise Settings & Governance Centre
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Control procurement rules, supplier verification requirements,
          SmartScore thresholds, notification preferences, finance gates, and
          platform defaults from one governed settings console.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Settings alert</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      {tableMissing && (
        <section className="mb-6 rounded-md border border-warning bg-warning-soft p-5">
          <p className="text-sm font-semibold text-warning">
            Database setup required
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-panel bg-card p-4 text-xs leading-6 text-heading">
{`create table if not exists platform_settings (
  id bigint generated always as identity primary key,
  setting_key text unique,
  setting_value jsonb,
  category text,
  description text,
  updated_at timestamptz default timezone('utc', now())
);

alter table platform_settings enable row level security;

create policy "Read platform settings"
on platform_settings
for select
using (true);

create policy "Insert platform settings"
on platform_settings
for insert
with check (true);

create policy "Update platform settings"
on platform_settings
for update
using (true);`}
          </pre>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Settings Loaded
          </p>
          <p className="mt-3 text-2xl font-semibold text-heading">
            {loading ? "..." : savedCount}
          </p>
          <p className="mt-2 text-xs text-muted">
            Persisted rows found in platform settings.
          </p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Governance Mode
          </p>
          <p className="mt-3 text-2xl font-semibold text-heading">
            {settings.require_invoice_approval_before_payment ? "Controlled" : "Advisory"}
          </p>
          <p className="mt-2 text-xs text-muted">
            Finance and supplier gates are configurable by admins.
          </p>
        </div>
        <div className="rounded-md border border-panel bg-card p-5 shadow-panel">
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Last Saved
          </p>
          <p className="mt-3 text-sm font-semibold text-heading">
            {formatUpdatedAt(
              Object.values(savedRows)
                .map((row) => row.updated_at)
                .filter(Boolean)
                .sort()
                .at(-1) ?? null
            )}
          </p>
          <p className="mt-2 text-xs text-muted">
            Uses row-level platform_settings persistence.
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            Platform Defaults
          </p>
          <p className="mt-1 text-sm text-muted">
            Empty database rows fall back to enterprise defaults until saved.
          </p>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving || loading || tableMissing}
          className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {groupedSettings.map(({ category, settings: categorySettings }) => (
            <section key={category} className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <div className="border-b border-panel pb-4">
                <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                  {category}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-heading">
                  {categorySettings.length} governed setting{categorySettings.length === 1 ? "" : "s"}
                </h2>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {categorySettings.map((definition) => (
                  <div key={definition.key} className="rounded-md border border-panel bg-panel p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <label
                          htmlFor={definition.key}
                          className="text-sm font-semibold text-heading"
                        >
                          {definition.label}
                        </label>
                        <p className="mt-1 text-xs leading-6 text-muted">
                          {definition.description}
                        </p>
                      </div>
                      {savedRows[definition.key] && (
                        <span className="inline-flex w-fit rounded-md border border-success bg-success-soft px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-success">
                          Saved
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      {definition.type === "boolean" ? (
                        <label
                          htmlFor={definition.key}
                          className="inline-flex cursor-pointer items-center gap-3"
                        >
                          <input
                            id={definition.key}
                            type="checkbox"
                            checked={Boolean(settings[definition.key])}
                            onChange={(event) =>
                              updateSetting(definition.key, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-panel text-accent focus:ring-accent"
                          />
                          <span className="text-sm font-semibold text-secondary">
                            {settings[definition.key] ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      ) : definition.type === "select" ? (
                        <select
                          id={definition.key}
                          value={String(settings[definition.key])}
                          onChange={(event) =>
                            updateSetting(definition.key, event.target.value)
                          }
                          className={inputClass}
                        >
                          {(definition.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={definition.key}
                          type="number"
                          min={definition.min}
                          max={definition.max}
                          step={definition.step ?? 1}
                          value={Number(settings[definition.key])}
                          onChange={(event) =>
                            updateSetting(definition.key, Number(event.target.value))
                          }
                          className={inputClass}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
