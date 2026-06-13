"use client"

import { useState } from "react"
import {
  generateComplianceChecklist,
  groupChecklist,
  countByStatus,
  type ChecklistItem,
  type ChecklistItemStatus,
  type ComplianceChecklistInput,
} from "@/lib/complianceChecklist"

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusBadgeClass(status: ChecklistItemStatus): string {
  switch (status) {
    case "Required":
      return "border-rose-500/35 bg-rose-500/10 text-rose-700"
    case "Recommended":
      return "border-warning/40 bg-warning/10 text-warning"
    case "Not Applicable":
      return "border-panel bg-panel text-muted"
  }
}

function statusDotClass(status: ChecklistItemStatus): string {
  switch (status) {
    case "Required":
      return "bg-rose-500"
    case "Recommended":
      return "bg-warning"
    case "Not Applicable":
      return "bg-muted"
  }
}

// ─── Single item ──────────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const [open, setOpen] = useState(false)

  if (item.status === "Not Applicable") return null

  return (
    <div
      className={`rounded-md border transition-colors ${
        item.status === "Required"
          ? "border-rose-500/20 bg-rose-500/5"
          : "border-warning/20 bg-warning/5"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Status dot */}
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotClass(item.status)}`}
          aria-hidden="true"
        />

        {/* Label + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <span className="text-sm font-semibold text-heading leading-snug">
              {item.label}
            </span>
            <span
              className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider ${statusBadgeClass(item.status)}`}
            >
              {item.status}
            </span>
          </div>

          {/* Help text — always shown, collapsed on mobile */}
          <p className={`mt-1 text-xs leading-relaxed text-secondary ${open ? "" : "line-clamp-2 sm:line-clamp-none"}`}>
            {item.helpText}
          </p>

          {/* Show-more only on mobile */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 text-[0.67rem] font-semibold text-accent transition hover:text-accent-strong sm:hidden"
            aria-expanded={open}
          >
            {open ? "Show less" : "Read more"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Print-mode row ───────────────────────────────────────────────────────────

function PrintRow({ item, index }: { item: ChecklistItem; index: number }) {
  if (item.status === "Not Applicable") return null
  return (
    <li className="flex gap-3 text-sm leading-6">
      <span className="font-mono text-xs font-semibold text-accent print:text-slate-500">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span>
        <span className="font-semibold text-heading print:text-slate-900">
          {item.label}
        </span>
        {" "}
        <span
          className={`inline-flex rounded-full border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider print:border-slate-300 print:text-slate-600 ${statusBadgeClass(item.status)}`}
        >
          {item.status}
        </span>
        <br />
        <span className="text-secondary print:text-slate-600">{item.helpText}</span>
      </span>
    </li>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = ComplianceChecklistInput & {
  title?: string
  description?: string
  /** Render a compact numbered list suitable for print/document-pack mode */
  printMode?: boolean
  /** Collapse to a summary by default, expandable */
  collapsible?: boolean
}

export default function ComplianceChecklist({
  category,
  province,
  industry,
  title = "Compliance Checklist",
  description,
  printMode = false,
  collapsible = false,
}: Props) {
  const [expanded, setExpanded] = useState(!collapsible)

  const items = generateComplianceChecklist({ category, province, industry })
  const groups = groupChecklist(items)
  const counts = countByStatus(items)

  const visibleItems = items.filter((i) => i.status !== "Not Applicable")

  if (visibleItems.length === 0) return null

  // ── Print mode ──────────────────────────────────────────────────────────────
  if (printMode) {
    let counter = 0
    return (
      <section className="rounded-md border border-panel bg-card p-6 shadow-panel print:border-slate-300 print:bg-white print:shadow-none">
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-accent print:text-slate-500">
          Compliance Requirements
        </p>
        <h2 className="mt-2 text-lg font-semibold text-heading print:text-slate-950">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-secondary print:text-slate-700">
            {description}
          </p>
        )}
        <ol className="mt-5 space-y-3 text-sm leading-6 text-secondary print:text-slate-700">
          {groups.map((group) =>
            group.items
              .filter((i) => i.status !== "Not Applicable")
              .map((item) => {
                counter++
                return <PrintRow key={item.id} item={item} index={counter - 1} />
              })
          )}
        </ol>
        <p className="mt-4 text-xs text-muted print:text-slate-500">
          {counts.required} Required · {counts.recommended} Recommended ·
          Generated by AiForm Procure Compliance Engine
        </p>
      </section>
    )
  }

  // ── Interactive mode ────────────────────────────────────────────────────────
  return (
    <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
      {/* Header */}
      <div className={`${collapsible ? "cursor-pointer" : ""} flex items-start justify-between gap-4`}
        onClick={collapsible ? () => setExpanded((v) => !v) : undefined}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v) } : undefined}
        aria-expanded={collapsible ? expanded : undefined}
      >
        <div className="min-w-0">
          <p className="text-[0.67rem] font-bold uppercase tracking-[0.24em] text-accent">
            Compliance Checklist
          </p>
          <h3 className="mt-1 text-base font-bold text-heading">{title}</h3>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-secondary">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Count pills */}
          <span className="hidden rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[0.62rem] font-bold text-rose-700 sm:inline-flex">
            {counts.required} Required
          </span>
          <span className="hidden rounded-full border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-[0.62rem] font-bold text-warning sm:inline-flex">
            {counts.recommended} Recommended
          </span>
          {collapsible && (
            <svg
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>

      {/* Summary bar (always visible) */}
      <div className="mt-3 flex flex-wrap gap-3 border-b border-panel pb-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
          <span className="font-bold text-heading">{counts.required}</span>
          <span className="text-secondary">Required</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
          <span className="font-bold text-heading">{counts.recommended}</span>
          <span className="text-secondary">Recommended</span>
        </div>
        {counts.notApplicable > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-muted" aria-hidden="true" />
            <span className="font-bold text-heading">{counts.notApplicable}</span>
            <span className="text-secondary">Not Applicable</span>
          </div>
        )}
        <span className="ml-auto text-[0.63rem] text-muted">
          Generated by local compliance engine · No external API
        </span>
      </div>

      {/* Body — grouped */}
      {expanded && (
        <div className="mt-4 space-y-5">
          {groups.map((group) => {
            const groupVisible = group.items.filter((i) => i.status !== "Not Applicable")
            if (groupVisible.length === 0) return null
            return (
              <div key={group.group}>
                <p className="mb-2 text-[0.63rem] font-bold uppercase tracking-[0.2em] text-secondary">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <ChecklistRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
