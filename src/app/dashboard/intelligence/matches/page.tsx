"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { createMatchAlertDrafts, type MatchAlertResult } from "@/lib/matchAlerts"
import { sendMatchAlertEmails } from "@/lib/matchAlertEmailClient"
import {
  calculateRFQMatches,
  type MatchLevel,
  type SupplierMatchResult,
} from "@/lib/matchingEngine"
import { createRFQWhatsAppMessage, createWhatsAppLink } from "@/lib/whatsapp"

function scoreClass(score: number): string {
  if (score >= 90) return "text-success"
  if (score >= 75) return "text-accent-strong"
  if (score >= 60) return "text-warning"
  return "text-muted"
}

function levelClass(level: MatchLevel): string {
  if (level === "Excellent Match") return "border-success/40 bg-success/10 text-success"
  if (level === "Strong Match") return "border-accent/40 bg-accent/10 text-accent-strong"
  if (level === "Moderate Match") return "border-warning/40 bg-warning/10 text-warning"
  return "border-panel bg-panel text-muted"
}

export default function SupplierMatchesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [alerting, setAlerting] = useState(false)
  const [emailingKeys, setEmailingKeys] = useState<string[]>([])
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { status: "sent" | "failed"; message: string }>>({})
  const [matches, setMatches] = useState<SupplierMatchResult[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const profile = await getCurrentProfile()
      if (profile?.role?.trim().toLowerCase() !== "admin") {
        router.replace("/dashboard")
        return
      }

      try {
        const result = await calculateRFQMatches()
        setMatches(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load supplier matches")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const summary = useMemo(() => {
    return {
      excellent: matches.filter((match) => match.match_level === "Excellent Match").length,
      strong: matches.filter((match) => match.match_level === "Strong Match").length,
      moderate: matches.filter((match) => match.match_level === "Moderate Match").length,
      total: matches.length,
    }
  }, [matches])

  const selectedMatches = useMemo(
    () => matches.filter((match) => selectedKeys.includes(`${match.rfq.id}-${match.supplier.id}`)),
    [matches, selectedKeys]
  )

  const strongMatches = useMemo(
    () =>
      matches.filter((match) =>
        match.match_level === "Strong Match" || match.match_level === "Excellent Match"
      ),
    [matches]
  )

  function toggleMatch(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  function setAllVisibleSelected(selected: boolean) {
    const visibleKeys = matches.slice(0, 100).map((match) => `${match.rfq.id}-${match.supplier.id}`)
    setSelectedKeys((current) => {
      if (!selected) return current.filter((key) => !visibleKeys.includes(key))
      return Array.from(new Set([...current, ...visibleKeys]))
    })
  }

  function summarizeAlertResult(result: MatchAlertResult): string {
    return `${result.notificationsCreated} notification(s) and ${result.whatsappDraftsCreated} WhatsApp draft(s) created.`
  }

  async function notifyMatches(targetMatches: SupplierMatchResult[]) {
    if (targetMatches.length === 0) {
      setError("Select at least one supplier match to notify.")
      setSuccess("")
      return
    }

    setAlerting(true)
    setError("")
    setSuccess("")

    try {
      const result = await createMatchAlertDrafts(
        targetMatches.map((match) => ({
          supplier: match.supplier,
          rfq: match.rfq,
          matchScore: match.match_score,
        }))
      )

      if (result.errors.length > 0) {
        setError(result.errors.join(" "))
      }
      setSuccess(summarizeAlertResult(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match alerts.")
    } finally {
      setAlerting(false)
    }
  }

  async function emailMatches(targetMatches: SupplierMatchResult[]) {
    if (targetMatches.length === 0) {
      setError("Select at least one supplier match to email.")
      setSuccess("")
      return
    }

    const targetKeys = targetMatches.map((match) => `${match.rfq.id}-${match.supplier.id}`)
    setEmailingKeys((current) => Array.from(new Set([...current, ...targetKeys])))
    setError("")
    setSuccess("")

    try {
      const result = await sendMatchAlertEmails(
        targetMatches.map((match) => ({
          supplier: match.supplier,
          rfq: match.rfq,
          matchScore: match.match_score,
        }))
      )

      setEmailStatuses((current) => {
        const next = { ...current }
        for (const match of targetMatches) {
          const key = `${match.rfq.id}-${match.supplier.id}`
          const sendResult = result.results.find((item) => item.supplierId === match.supplier.id)
          if (!sendResult) continue
          next[key] = {
            status: sendResult.status,
            message: sendResult.status === "sent" ? "Email sent." : sendResult.error || "Email failed.",
          }
        }
        return next
      })

      if (result.errors.length > 0) {
        setError(result.errors.join(" "))
      }
      setSuccess(`${result.sent} email(s) sent. ${result.failed} failed. ${result.emailAlertsCreated} alert log row(s) created.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send match alert emails."
      setError(message)
      setEmailStatuses((current) => {
        const next = { ...current }
        for (const match of targetMatches) {
          next[`${match.rfq.id}-${match.supplier.id}`] = { status: "failed", message }
        }
        return next
      })
    } finally {
      setEmailingKeys((current) => current.filter((key) => !targetKeys.includes(key)))
    }
  }

  const visibleMatches = matches.slice(0, 100)
  const visibleKeys = visibleMatches.map((match) => `${match.rfq.id}-${match.supplier.id}`)
  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key))

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="enterprise-section-label">Supplier Intelligence</p>
        <h1 className="enterprise-page-title">Opportunity Matching Engine</h1>
        <p className="enterprise-page-description">
          Suppliers ranked against RFQs using industry fit, province alignment,
          verification status, SmartScore, recent activity, and supplier risk signals.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">Match alert workflow</p>
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-md border border-success/30 bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">Match alert workflow</p>
          <p className="mt-1 text-xs text-success">{success}</p>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          ["All Matches", summary.total],
          ["Excellent", summary.excellent],
          ["Strong", summary.strong],
          ["Moderate", summary.moderate],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
              {label}
            </p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-heading">{value}</p>
          </div>
        ))}
      </section>

      {loading ? (
        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="h-5 w-56 animate-pulse rounded bg-panel" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-panel" />
            ))}
          </div>
        </div>
      ) : (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-panel bg-panel px-4 py-3">
            <p className="text-xs font-semibold text-secondary">
              {selectedMatches.length} selected &middot; Email sends immediately &middot; WhatsApp remains draft-only
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllVisibleSelected(!allVisibleSelected)}
                disabled={visibleKeys.length === 0}
                className="rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allVisibleSelected ? "Clear visible" : "Select all"}
              </button>
              <button
                type="button"
                onClick={() => emailMatches(selectedMatches)}
                disabled={emailingKeys.length > 0 || selectedMatches.length === 0}
                className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-bold text-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emailingKeys.length > 0 ? "Sending..." : "Send to selected"}
              </button>
              <button
                type="button"
                onClick={() => notifyMatches(selectedMatches)}
                disabled={alerting || selectedMatches.length === 0}
                className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-bold text-button disabled:cursor-not-allowed disabled:opacity-50"
              >
                Notify Selected
              </button>
              <button
                type="button"
                onClick={() => notifyMatches(strongMatches)}
                disabled={alerting || strongMatches.length === 0}
                className="rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Notify All Strong Matches
              </button>
              <button
                type="button"
                onClick={() => notifyMatches(selectedMatches.length > 0 ? selectedMatches : strongMatches)}
                disabled={alerting || (selectedMatches.length === 0 && strongMatches.length === 0)}
                className="rounded-md border border-success bg-success-soft px-3 py-2 text-xs font-bold text-success disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create WhatsApp Drafts
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-panel bg-panel text-[0.66rem] uppercase tracking-[0.18em] text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Select</th>
                  <th className="px-4 py-3 font-semibold">RFQ</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Match Score</th>
                  <th className="px-4 py-3 font-semibold">Match Level</th>
                  <th className="px-4 py-3 font-semibold">SmartScore</th>
                  <th className="px-4 py-3 font-semibold">Province</th>
                  <th className="px-4 py-3 font-semibold">Industry</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel">
                {visibleMatches.map((match) => {
                  const matchKey = `${match.rfq.id}-${match.supplier.id}`
                  const emailStatus = emailStatuses[matchKey]
                  const whatsappMessage = createRFQWhatsAppMessage(
                    match.rfq,
                    match.supplier,
                    "New RFQ"
                  )
                  const whatsappLink = createWhatsAppLink({
                    phone: match.supplier.phone,
                    message: whatsappMessage,
                  })

                  return (
                    <tr key={matchKey} className="align-top">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(matchKey)}
                          onChange={() => toggleMatch(matchKey)}
                          className="h-4 w-4 rounded border-panel accent-accent"
                          aria-label={`Select ${match.supplier.business_name ?? "supplier"} for ${match.rfq.title ?? `RFQ-${match.rfq.id}`}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-heading">
                          {match.rfq.title ?? `RFQ-${match.rfq.id}`}
                        </p>
                        <p className="mt-1 text-xs text-muted">{match.rfq.category ?? "No category"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-heading">
                          {match.supplier.business_name ?? "Unnamed Supplier"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {match.supplier.verification_status ?? "Verification pending"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-lg font-bold tabular-nums ${scoreClass(match.match_score)}`}>
                          {match.match_score}%
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${levelClass(match.match_level)}`}>
                          {match.match_level}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold tabular-nums text-heading">{match.smartscore}</td>
                      <td className="px-4 py-4 text-secondary">
                        {match.supplier.province ?? match.rfq.province ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-secondary">
                        {match.supplier.industry ?? "-"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[260px] flex-wrap gap-2">
                          <Link
                            href={`/dashboard/rfqs/${match.rfq.id}`}
                            className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-bold text-button hover:bg-accent-strong"
                          >
                            View RFQ
                          </Link>
                          <Link
                            href={`/dashboard/messages?receiver_id=${match.supplier.id}&rfq_id=${match.rfq.id}&subject=${encodeURIComponent(`RFQ-${match.rfq.id} supplier enquiry`)}`}
                            className="rounded-md border border-panel bg-surface px-3 py-2 text-xs font-bold text-secondary hover:border-accent hover:text-accent"
                          >
                            Contact Supplier
                          </Link>
                          <button
                            type="button"
                            onClick={() => emailMatches([match])}
                            disabled={emailingKeys.includes(matchKey)}
                            className="rounded-md border border-accent bg-accent px-3 py-2 text-xs font-bold text-button hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
                            title={match.supplier.email ? `Send to ${match.supplier.email}` : "No supplier email on record"}
                          >
                            {emailingKeys.includes(matchKey) ? "Sending..." : "Send email"}
                          </button>
                          {whatsappLink ? (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md border border-success bg-success-soft px-3 py-2 text-xs font-bold text-success hover:bg-success/10"
                            >
                              Send WhatsApp Alert
                            </a>
                          ) : (
                            <span className="rounded-md border border-panel bg-panel px-3 py-2 text-xs font-semibold text-muted">
                              No WhatsApp
                            </span>
                          )}
                          {emailStatus && (
                            <span
                              className={[
                                "rounded-md border px-3 py-2 text-xs font-semibold",
                                emailStatus.status === "sent"
                                  ? "border-success/30 bg-success-soft text-success"
                                  : "border-rose-500/25 bg-rose-500/10 text-rose-700",
                              ].join(" ")}
                            >
                              {emailStatus.message}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {matches.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-heading">No supplier matches available yet.</p>
              <p className="mt-2 text-sm text-secondary">
                Add supplier profiles and RFQs to generate opportunity recommendations.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
