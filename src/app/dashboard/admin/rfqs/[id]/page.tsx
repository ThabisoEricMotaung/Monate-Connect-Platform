"use client"

import Link from "next/link"
import SignedDocumentLink from "@/components/SignedDocumentLink"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string | null
  description: string | null
  province: string | null
  category: string | null
  budget: string | null
  deadline: string | null
  status: string | null
  attachment_url: string | null
  created_at?: string | null
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatBudget(value: string | null): string {
  if (!value) return "Not disclosed"
  const numeric = Number(String(value).replace(/[^\d]/g, ""))
  if (!Number.isFinite(numeric) || numeric <= 0) return value

  return `R ${numeric.toLocaleString("en-ZA")}`
}

function statusClass(status: string | null): string {
  const value = String(status ?? "").toLowerCase()
  if (value === "draft") return "border-warning bg-warning-soft text-warning"
  if (value === "open") return "border-success bg-success-soft text-success"
  if (value.includes("award")) return "border-accent bg-accent/15 text-accent"

  return "border-panel bg-panel text-secondary"
}

export default function AdminRFQDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadRFQ() {
      const profile = await requireAdminOrBuyer()

      if (!profile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase is not configured.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("rfqs")
        .select("id, title, description, province, category, budget, deadline, status, attachment_url, created_at")
        .eq("id", Number(params.id))
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setRfq((data as RFQ | null) ?? null)
      setLoading(false)
    }

    loadRFQ()

    return () => {
      cancelled = true
    }
  }, [params.id, router])

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-panel pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Procurement &gt; RFQs &gt; RFQ-{params.id}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {rfq?.title ?? "RFQ detail"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Review the RFQ record, status, targeting, and attached procurement documents.
          </p>
        </div>
        <Link
          href={`/dashboard/admin/rfqs/${params.id}/quotes`}
          className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
        >
          View quotes
        </Link>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
      ) : errorMessage ? (
        <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
          <p className="text-sm font-semibold text-rose-700">RFQ failed to load</p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      ) : !rfq ? (
        <div className="rounded-md border border-panel bg-card p-12 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">RFQ not found.</p>
          <Link href="/dashboard/admin" className="mt-4 inline-flex text-sm font-semibold text-accent">
            Back to overview
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Scope
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">{rfq.title}</h2>
            </div>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-secondary">
              {rfq.description || "No description has been captured yet."}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
              <span
                className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusClass(rfq.status)}`}
              >
                {rfq.status ?? "Unknown"}
              </span>
              <div className="mt-5 space-y-3 text-sm text-secondary">
                <p><span className="font-semibold text-heading">Category:</span> {rfq.category || "-"}</p>
                <p><span className="font-semibold text-heading">Province:</span> {rfq.province || "-"}</p>
                <p><span className="font-semibold text-heading">Budget:</span> {formatBudget(rfq.budget)}</p>
                <p><span className="font-semibold text-heading">Deadline:</span> {formatDate(rfq.deadline)}</p>
                <p><span className="font-semibold text-heading">Created:</span> {formatDate(rfq.created_at)}</p>
              </div>
              {rfq.attachment_url && (
                <SignedDocumentLink value={rfq.attachment_url} bucket="rfq-documents" className="mt-5 inline-flex text-sm font-semibold text-accent transition hover:text-accent-strong">
                  Open attachment
                </SignedDocumentLink>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
