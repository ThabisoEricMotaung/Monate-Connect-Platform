"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import SaveRFQControl from "@/components/rfqs/SaveRFQControl"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { getSavedRFQs, type SavedRFQ } from "@/lib/savedRFQs"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string
  description: string | null
  province: string | null
  region: string | null
  category: string | null
  budget: string | null
  status: string | null
  deadline: string | null
  is_external_opportunity?: boolean | null
  original_source_url?: string | null
  source_name?: string | null
}

type SavedRFQRow = {
  saved: SavedRFQ
  rfq: RFQ | null
}

const statusStyles: Record<string, string> = {
  Open: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Closed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Awarded: "border-success bg-success-soft text-success",
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatRand(amount: string | null): string {
  if (!amount) return "-"
  const clean = amount.replace(/[^\d]/g, "")
  const num = Number(clean)
  if (!clean || Number.isNaN(num)) return amount
  return `R${num.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function formatSavedDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function SavedRFQsPage() {
  const [rows, setRows] = useState<SavedRFQRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      let savedList: SavedRFQ[]
      try {
        savedList = await getSavedRFQs()
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load saved RFQs.")
        setLoading(false)
        return
      }

      if (savedList.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const rfqIds = savedList.map((s) => s.rfq_id)

      const { data: rfqData, error: rfqError } = await supabase
        .from("rfqs")
        .select("id, title, description, province, region, category, budget, status, deadline, is_external_opportunity, original_source_url, source_name")
        .in("id", rfqIds)

      if (rfqError) {
        setErrorMessage(rfqError.message)
        setLoading(false)
        return
      }

      const rfqMap = new Map<number, RFQ>(
        ((rfqData ?? []) as RFQ[]).map((r) => [r.id, r])
      )

      setRows(
        savedList.map((saved) => ({
          saved,
          rfq: rfqMap.get(saved.rfq_id) ?? null,
        }))
      )
      setLoading(false)
    }

    load()
  }, [])

  function handleRemoved(rfqId: number) {
    setRows((prev) => prev.filter((r) => r.saved.rfq_id !== rfqId))
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          My Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Saved RFQs
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          RFQs you have bookmarked for later review or submission. Manage your
          shortlist and track deadlines across saved opportunities.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Failed to load saved RFQs
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-panel bg-card p-6 shadow-panel"
            >
              <div className="h-4 w-64 animate-pulse rounded bg-panel" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-14 animate-pulse rounded-md bg-panel" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !errorMessage && rows.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No saved RFQs yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Bookmark RFQs from the opportunities list to track them here.
          </p>
          <Link
            href="/dashboard/rfqs"
            className="mt-6 inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
          >
            Browse RFQs
          </Link>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-5">
          {rows.map(({ saved, rfq }) => {
            if (!rfq) {
              return (
                <article
                  key={saved.id}
                  className="rounded-md border border-panel bg-card p-6 shadow-panel"
                >
                  <p className="text-sm text-muted">
                    RFQ #{saved.rfq_id} — no longer available.
                  </p>
                  <div className="mt-3">
                    <SaveRFQControl
                      rfqId={saved.rfq_id}
                      compact
                      onRemoved={() => handleRemoved(saved.rfq_id)}
                    />
                  </div>
                </article>
              )
            }

            const displayStatus = getRFQDisplayStatus(rfq.status, rfq.deadline)
            const isClosed =
              displayStatus === "Closed" || displayStatus === "Awarded"
            const isExternalOpportunity = Boolean(rfq.is_external_opportunity)
            const sourceName = rfq.source_name?.trim() || "External"

            return (
              <article
                key={saved.id}
                className="rounded-md border border-panel bg-card p-6 shadow-panel"
              >
                <div className="flex flex-col gap-3 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                        RFQ #{rfq.id}
                      </p>
                      <span
                        className={[
                          "inline-flex rounded-md border px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]",
                          statusStyles[displayStatus] ??
                            "border-panel bg-panel text-secondary",
                        ].join(" ")}
                      >
                        {displayStatus}
                      </span>
                      {isExternalOpportunity && (
                        <span className="inline-flex rounded-md border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-accent-strong">
                          {sourceName}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold leading-snug text-heading">
                      {rfq.title}
                    </h2>
                    {rfq.description && (
                      <p className="mt-1.5 max-w-3xl text-sm leading-7 text-secondary line-clamp-2">
                        {rfq.description}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-muted">
                    Saved {formatSavedDate(saved.created_at)}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Region
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {rfq.region || rfq.province || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Category
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {rfq.category || "-"}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Budget (ZAR)
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {formatRand(rfq.budget)}
                    </p>
                  </div>
                  <div className="rounded-md border border-panel bg-panel p-4">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Deadline
                    </p>
                    <p className="mt-2 text-sm font-semibold text-heading">
                      {formatDeadline(rfq.deadline)}
                    </p>
                  </div>
                </div>

                {saved.notes && (
                  <div className="mt-3 rounded-md border border-panel bg-panel px-4 py-3">
                    <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                      Your notes
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-heading">
                      {saved.notes}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-panel pt-4">
                  <Link
                    href={`/dashboard/rfqs/${rfq.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
                  >
                    View RFQ
                  </Link>
                  {isExternalOpportunity ? (
                    <>
                      {rfq.original_source_url && (
                        <a
                          href={rfq.original_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
                        >
                          View Original Tender
                        </a>
                      )}
                      <p className="basis-full text-xs leading-5 text-muted">
                        This opportunity is sourced from {sourceName}. Apply through the official channel; quotes cannot be submitted through AiForm Procure.
                      </p>
                    </>
                  ) : !isClosed && (
                    <Link
                      href={`/dashboard/rfqs/${rfq.id}/submit`}
                      className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
                    >
                      Submit Quote
                    </Link>
                  )}
                  <SaveRFQControl
                    rfqId={rfq.id}
                    compact
                    onRemoved={() => handleRemoved(rfq.id)}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
