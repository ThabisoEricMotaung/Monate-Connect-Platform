"use client"

import { useState } from "react"
import type { ComplianceResult, ComplianceIssueSeverity } from "@/lib/policyCompliance"
import { requestOverride, type ProcurementOverride } from "@/lib/procurementOverrides"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: ComplianceResult["status"]) {
  switch (status) {
    case "Compliant":
      return {
        border:  "border-success/40",
        bg:      "bg-success/8",
        badge:   "border-success/40 bg-success/10 text-success",
        dot:     "bg-success",
        heading: "text-success",
        label:   "Compliant",
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ),
      }
    case "Warning":
      return {
        border:  "border-warning/35",
        bg:      "bg-warning/6",
        badge:   "border-warning/40 bg-warning/10 text-warning",
        dot:     "bg-warning",
        heading: "text-warning",
        label:   "Warning",
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      }
    case "Blocked":
      return {
        border:  "border-rose-500/35",
        bg:      "bg-rose-500/6",
        badge:   "border-rose-500/35 bg-rose-500/10 text-rose-700",
        dot:     "bg-rose-500",
        heading: "text-rose-700",
        label:   "Blocked",
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        ),
      }
  }
}

function issueSeverityConfig(severity: ComplianceIssueSeverity) {
  switch (severity) {
    case "error":
      return {
        dot:   "bg-rose-500",
        text:  "text-rose-700",
        badge: "border-rose-500/30 bg-rose-500/10 text-rose-700",
        label: "Error",
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        ),
      }
    case "warning":
      return {
        dot:   "bg-warning",
        text:  "text-warning",
        badge: "border-warning/35 bg-warning/10 text-warning",
        label: "Warning",
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      }
    case "info":
      return {
        dot:   "bg-sky-500",
        text:  "text-sky-700",
        badge: "border-sky-500/30 bg-sky-500/10 text-sky-700",
        label: "Info",
        icon: (
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
      }
  }
}

// ─── Override request form ────────────────────────────────────────────────────

function OverrideRequestForm({
  entityType,
  entityId,
  blockedReason,
  onSuccess,
  onCancel,
}: {
  entityType: string
  entityId: string
  blockedReason: string
  onSuccess: (override: ProcurementOverride) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setFormError("Override justification is required.")
      return
    }
    if (reason.trim().length < 20) {
      setFormError("Please provide a more detailed justification (at least 20 characters).")
      return
    }
    setSubmitting(true)
    setFormError("")
    const result = await requestOverride({
      entity_type: entityType,
      entity_id: entityId,
      blocked_reason: blockedReason,
      override_reason: reason.trim(),
    })
    setSubmitting(false)
    if (result) {
      onSuccess(result)
    } else {
      setFormError(
        "Failed to submit override request. Ensure the procurement_overrides table exists (run SQL migration in Admin → Overrides)."
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-md border border-rose-500/25 bg-rose-500/5 p-4">
      <div>
        <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-rose-700">Override Request</p>
        <p className="mt-0.5 text-xs text-secondary">
          Provide documented justification for bypassing this compliance check. Your request will be
          reviewed by a procurement administrator.
        </p>
      </div>

      <div className="rounded-md border border-panel bg-surface px-3 py-2.5">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-muted">Blocked Reason</p>
        <p className="mt-0.5 text-xs text-secondary">{blockedReason}</p>
      </div>

      <div>
        <label htmlFor="override-reason" className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-secondary">
          Override Justification <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="override-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          placeholder="Explain why this compliance check should be overridden. Include regulatory basis, delegated authority reference, or exceptional circumstance..."
          className="w-full resize-none rounded-md border border-panel bg-panel px-3 py-2.5 text-xs text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-60"
        />
        <p className="mt-1 text-[0.6rem] text-muted">
          {reason.length} characters — minimum 20 required
        </p>
      </div>

      {formError && (
        <p className="text-xs font-semibold text-rose-700">{formError}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting || !reason.trim()}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
          {submitting ? "Submitting…" : "Submit Override Request"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-panel bg-surface px-4 py-2 text-xs font-semibold text-secondary transition hover:bg-panel disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── ComplianceBanner ─────────────────────────────────────────────────────────

type Props = {
  result: ComplianceResult | null
  title?: string
  /** Start collapsed */
  collapsible?: boolean
  /** Don't show when Compliant */
  hideWhenCompliant?: boolean
  className?: string
  /** If provided and result.status === "Blocked", show "Request Override" */
  entityType?: string
  entityId?: string
  /** If provided, show the approved override state instead of override request */
  approvedOverride?: ProcurementOverride | null
}

export default function ComplianceBanner({
  result,
  title = "Policy Compliance Check",
  collapsible = false,
  hideWhenCompliant = false,
  className = "",
  entityType,
  entityId,
  approvedOverride,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [overrideSubmitted, setOverrideSubmitted] = useState<ProcurementOverride | null>(null)

  if (!result) return null
  if (hideWhenCompliant && result.status === "Compliant") return null

  const cfg = statusConfig(result.status)
  const errorCount   = result.issues.filter((i) => i.severity === "error").length
  const warningCount = result.issues.filter((i) => i.severity === "warning").length

  const canRequestOverride =
    result.status === "Blocked" &&
    entityType &&
    entityId &&
    !overrideSubmitted &&
    !approvedOverride

  // The primary blocking reason for the override form
  const primaryBlockReason =
    result.issues.find((i) => i.severity === "error")?.message ??
    result.issues[0]?.message ??
    "Action blocked by compliance check."

  return (
    <div
      className={[
        "rounded-md border shadow-panel",
        cfg.border, cfg.bg, className,
      ].join(" ")}
      role="region"
      aria-label={`${title}: ${result.status}`}
    >
      {/* ── Header ── */}
      <div
        className={[
          "flex items-center justify-between gap-3 px-5 py-4",
          collapsible ? "cursor-pointer" : "",
        ].join(" ")}
        onClick={collapsible ? () => setExpanded((v) => !v) : undefined}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v) } : undefined}
      >
        <div className="flex items-center gap-3">
          <span className={cfg.heading}>{cfg.icon}</span>
          <div>
            <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-muted">{title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
                {cfg.label}
              </span>
              {errorCount > 0 && (
                <span className="text-[0.62rem] font-semibold text-rose-700">
                  {errorCount} error{errorCount !== 1 ? "s" : ""}
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-[0.62rem] font-semibold text-warning">
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </span>
              )}
              {result.issues.length === 0 && (
                <span className="text-[0.62rem] text-success">All checks passed</span>
              )}
              {/* Approved override badge */}
              {approvedOverride && result.status === "Blocked" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.6rem] font-bold text-success">
                  ✓ Override Approved
                </span>
              )}
            </div>
          </div>
        </div>

        {collapsible && (
          <svg
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {/* ── Body ── */}
      {(!collapsible || expanded) && (
        <>
          {/* Approved override notice — shown above issues when override exists */}
          {approvedOverride && result.status === "Blocked" && (
            <div className="border-t border-panel/50 px-5 py-4">
              <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success-soft px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-success">Override approved — you may proceed</p>
                  <p className="mt-0.5 text-xs text-success/80">
                    Approved by {approvedOverride.approved_by_email ?? "an administrator"}.
                    Reason: {approvedOverride.override_reason ?? "See override record."}
                  </p>
                  <p className="mt-1 text-[0.62rem] font-semibold text-warning">
                    ⚠ Proceed with caution — the compliance issues listed below still apply.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Issues + recommendations */}
          {(result.issues.length > 0 || result.recommendations.length > 0) && (
            <div className={`${approvedOverride ? "" : "border-t border-panel/50"} px-5 pb-5 pt-4`}>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_280px]">

                {/* Issues */}
                {result.issues.length > 0 && (
                  <div>
                    <p className="mb-2.5 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">
                      Issues Found
                    </p>
                    <ul className="space-y-2">
                      {result.issues.map((issue, i) => {
                        const ic = issueSeverityConfig(issue.severity)
                        return (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className={ic.text}>{ic.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs leading-relaxed ${ic.text} font-semibold`}>
                                {issue.message}
                              </p>
                              {issue.field && (
                                <p className="mt-0.5 font-mono text-[0.6rem] text-muted">
                                  field: {issue.field}
                                </p>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div className={result.issues.length > 0 ? "sm:border-l sm:border-panel/50 sm:pl-4" : ""}>
                    <p className="mb-2.5 text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">
                      Recommended Actions
                    </p>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                          <p className="text-xs leading-relaxed text-secondary">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compliant confirmation */}
          {result.status === "Compliant" && result.issues.length === 0 && (
            <div className="border-t border-panel/50 px-5 py-3">
              <p className="text-xs text-success">
                All policy checks passed. This action is compliant with procurement governance requirements.
              </p>
            </div>
          )}

          {/* Override section — only shown when Blocked and override is available */}
          {result.status === "Blocked" && !approvedOverride && (
            <div className="border-t border-rose-500/20 px-5 py-4">
              {overrideSubmitted ? (
                /* Override request submitted — success state */
                <div className="flex items-start gap-3 rounded-md border border-sky-500/30 bg-sky-500/8 px-4 py-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-sky-700">Override request submitted</p>
                    <p className="mt-0.5 text-xs text-secondary">
                      Your request is pending admin review. Reference ID: {overrideSubmitted.id}.
                      Check Admin → Overrides for status updates.
                    </p>
                    <button
                      type="button"
                      onClick={() => setOverrideSubmitted(null)}
                      className="mt-2 text-[0.67rem] font-semibold text-sky-700 transition hover:underline"
                    >
                      Submit another request
                    </button>
                  </div>
                </div>
              ) : showOverrideForm && canRequestOverride ? (
                /* Inline override request form */
                <OverrideRequestForm
                  entityType={entityType!}
                  entityId={entityId!}
                  blockedReason={primaryBlockReason}
                  onSuccess={(override) => {
                    setOverrideSubmitted(override)
                    setShowOverrideForm(false)
                  }}
                  onCancel={() => setShowOverrideForm(false)}
                />
              ) : (
                /* Override request prompt */
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.63rem] font-bold uppercase tracking-[0.18em] text-muted">
                      Override Available
                    </p>
                    <p className="mt-0.5 text-xs text-secondary">
                      {canRequestOverride
                        ? "If you have authority to override this compliance block, submit a documented justification for admin review."
                        : "Contact a procurement administrator to request an override for this blocked action."}
                    </p>
                  </div>
                  {canRequestOverride && (
                    <button
                      type="button"
                      onClick={() => setShowOverrideForm(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-rose-500/35 bg-rose-500/8 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-500/15"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      Request Override
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
