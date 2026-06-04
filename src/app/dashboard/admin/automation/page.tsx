"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  runClosingSoonCheck,
  runComplianceExpiryCheck,
  runContractExpiryCheck,
  type AutomationRunResult,
} from "@/lib/automationRules"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type AutomatedNotification = {
  id: number
  type: string | null
  title: string | null
  message: string | null
  link: string | null
  read: boolean | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type WhatsAppDraft = {
  id: number
  supplier_id: string | null
  supplier_phone: string | null
  alert_type: string | null
  message: string | null
  rfq_id: number | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type AutomationCounts = {
  notificationCount: number
  draftCount: number
  pendingDrafts: number
}

const statusClass =
  "rounded-md border border-panel bg-card p-5 shadow-panel"

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function metadataSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "-"

  const parts = [
    metadata.rfq_id ? `RFQ-${metadata.rfq_id}` : null,
    metadata.quote_id ? `Quote ${metadata.quote_id}` : null,
    metadata.purchase_order_id ? `PO ${metadata.purchase_order_id}` : null,
    metadata.contract_id ? `Contract ${metadata.contract_id}` : null,
    metadata.invoice_id ? `Invoice ${metadata.invoice_id}` : null,
    metadata.payment_id ? `Payment ${metadata.payment_id}` : null,
    metadata.supplier_name ? String(metadata.supplier_name) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(metadata)
}

function resultMessage(result: AutomationRunResult, label: string): string {
  const base = `${label} completed. Processed ${result.processed} record${result.processed === 1 ? "" : "s"}.`
  return result.errors.length > 0
    ? `${base} ${result.errors.length} issue${result.errors.length === 1 ? "" : "s"} logged.`
    : base
}

export default function AdminAutomationRulesPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AutomatedNotification[]>([])
  const [drafts, setDrafts] = useState<WhatsAppDraft[]>([])
  const [counts, setCounts] = useState<AutomationCounts>({
    notificationCount: 0,
    draftCount: 0,
    pendingDrafts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [runningCheck, setRunningCheck] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  async function loadAutomationData() {
    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      setLoading(false)
      return
    }

    const [notificationResult, draftResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, message, link, read, metadata, created_at")
        .contains("metadata", { automation_generated: true })
        .order("created_at", { ascending: false })
        .limit(25),
      supabase
        .from("whatsapp_alerts")
        .select("id, supplier_id, supplier_phone, alert_type, message, rfq_id, metadata, created_at")
        .contains("metadata", { automation_generated: true })
        .order("created_at", { ascending: false })
        .limit(25),
    ])

    if (notificationResult.error) {
      setErrorMessage(notificationResult.error.message)
    } else {
      setNotifications((notificationResult.data ?? []) as AutomatedNotification[])
    }

    if (draftResult.error) {
      setErrorMessage(draftResult.error.message)
    } else {
      const draftRows = (draftResult.data ?? []) as WhatsAppDraft[]
      setDrafts(draftRows)
      setCounts({
        notificationCount: notificationResult.data?.length ?? 0,
        draftCount: draftRows.length,
        pendingDrafts: draftRows.filter((draft) => draft.metadata?.draft_status === "Draft").length,
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    async function gateAndLoad() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      await loadAutomationData()
    }

    gateAndLoad()
  }, [router])

  const automationStatus = useMemo(() => {
    if (errorMessage) return "Needs Attention"
    if (loading) return "Loading"
    return "Active"
  }, [errorMessage, loading])

  async function runManualCheck(
    key: string,
    label: string,
    runner: () => Promise<AutomationRunResult>
  ) {
    setRunningCheck(key)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const result = await runner()
      setSuccessMessage(resultMessage(result, label))
      if (result.errors.length > 0) {
        console.warn(`${label} automation issues:`, result.errors)
      }
      await loadAutomationData()
    } catch (error) {
      console.warn(`${label} failed:`, error)
      setErrorMessage(error instanceof Error ? error.message : `${label} failed.`)
    } finally {
      setRunningCheck(null)
    }
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / Governance Automation
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Notification Automation Rules
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Monitor automated in-app notifications and WhatsApp alert drafts for
          RFQs, awards, purchase orders, contracts, invoices, payments, and
          supplier compliance.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Automation alert</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className={statusClass}>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Automation Status
          </p>
          <p className="mt-3 text-2xl font-semibold text-heading">
            {automationStatus}
          </p>
          <p className="mt-2 text-xs text-muted">
            Rules use Supabase inserts and never send live WhatsApp messages.
          </p>
        </div>
        <div className={statusClass}>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Automated Notifications
          </p>
          <p className="mt-3 text-2xl font-semibold text-heading">
            {counts.notificationCount}
          </p>
          <p className="mt-2 text-xs text-muted">
            Recent in-app notification records generated by automation.
          </p>
        </div>
        <div className={statusClass}>
          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            WhatsApp Drafts
          </p>
          <p className="mt-3 text-2xl font-semibold text-heading">
            {counts.pendingDrafts}
          </p>
          <p className="mt-2 text-xs text-muted">
            Drafted wa.me alerts awaiting manual opening or review.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Manual Triggers
            </p>
            <h2 className="mt-2 text-lg font-semibold text-heading">
              Run scheduled checks on demand
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={Boolean(runningCheck)}
              onClick={() => runManualCheck("closing", "Closing soon check", runClosingSoonCheck)}
              className="rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningCheck === "closing" ? "Running..." : "Run Closing Soon Check"}
            </button>
            <button
              type="button"
              disabled={Boolean(runningCheck)}
              onClick={() => runManualCheck("compliance", "Compliance expiry check", runComplianceExpiryCheck)}
              className="rounded-md border border-warning bg-warning-soft px-5 py-2.5 text-sm font-semibold text-warning transition hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningCheck === "compliance" ? "Running..." : "Run Compliance Expiry Check"}
            </button>
            <button
              type="button"
              disabled={Boolean(runningCheck)}
              onClick={() => runManualCheck("contracts", "Contract expiry check", runContractExpiryCheck)}
              className="rounded-md border border-success bg-success-soft px-5 py-2.5 text-sm font-semibold text-success transition hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningCheck === "contracts" ? "Running..." : "Run Contract Expiry Check"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-md border border-panel bg-card shadow-panel">
          <div className="border-b border-panel px-5 py-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              Recent Automated Notifications
            </p>
          </div>
          {loading ? (
            <div className="h-56 animate-pulse bg-panel" />
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-heading">No automated notifications yet.</p>
              <p className="mt-2 text-xs text-muted">Triggered rules will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-panel">
              {notifications.map((notification) => (
                <article key={notification.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                        {notification.type || "Notification"}
                      </p>
                      <h3 className="mt-2 text-sm font-semibold text-heading">
                        {notification.title || "Untitled notification"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-secondary">
                        {notification.message || "-"}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {metadataSummary(notification.metadata)}
                      </p>
                    </div>
                    <p className="text-xs text-muted">{formatDate(notification.created_at)}</p>
                  </div>
                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="mt-3 inline-flex text-xs font-semibold text-accent transition hover:text-accent-strong"
                    >
                      View linked record
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-panel bg-card shadow-panel">
          <div className="border-b border-panel px-5 py-4">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
              WhatsApp Alert Drafts
            </p>
          </div>
          {loading ? (
            <div className="h-56 animate-pulse bg-panel" />
          ) : drafts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-heading">No WhatsApp drafts yet.</p>
              <p className="mt-2 text-xs text-muted">Automation creates drafts only; sending remains manual.</p>
            </div>
          ) : (
            <div className="divide-y divide-panel">
              {drafts.map((draft) => {
                const waLink = typeof draft.metadata?.wa_link === "string" ? draft.metadata.wa_link : null

                return (
                  <article key={draft.id} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                          {draft.alert_type || "WhatsApp Draft"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-secondary">
                          {draft.message || "-"}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Supplier phone: {draft.supplier_phone || "No phone"}
                        </p>
                      </div>
                      <p className="text-xs text-muted">{formatDate(draft.created_at)}</p>
                    </div>
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex rounded-md border border-success bg-success-soft px-4 py-2 text-xs font-semibold text-success transition hover:bg-success/10"
                      >
                        Open WhatsApp Draft
                      </a>
                    ) : (
                      <span className="mt-3 inline-flex rounded-md border border-panel bg-panel px-4 py-2 text-xs font-semibold text-muted">
                        No valid WhatsApp link
                      </span>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
