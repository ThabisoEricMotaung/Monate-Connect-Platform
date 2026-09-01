"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentProfile } from "@/lib/auth"
import { getSupplierMatches } from "@/lib/matchingEngine"
import { supabase } from "@/lib/supabase"
import { ThsuoWorkspace, ErrorBoundary, LoadingState } from "@/components/thuso"
import "@/styles/thuso-animations.css"

type Role = "buyer" | "admin" | "supplier"

type ActiveRfq = {
  id: number
  title: string
  buyerOrg: string | null
  category: string | null
  closingDate: string | null
}

type RfqRow = {
  id: number | string
  title: string | null
  buyer_org: string | null
  category: string | null
  closing_date: string | null
  status: string | null
}

const OPEN_STATUSES = new Set(["open", "published", "active", "evaluation", "under review", "review"])

function toActiveRfq(row: RfqRow): ActiveRfq {
  return {
    id: Number(row.id),
    title: row.title ?? `RFQ-${row.id}`,
    buyerOrg: row.buyer_org ?? null,
    category: row.category ?? null,
    closingDate: row.closing_date ?? null,
  }
}

function daysUntil(value: string | null): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDeadline(value: string | null): string {
  if (!value) return "No deadline set"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No deadline set"
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })
}

function urgency(days: number | null): { text: string; badgeClass: string } {
  if (days === null) return { text: "No deadline set", badgeClass: "border-panel bg-surface text-secondary" }
  if (days < 0) return { text: "Closed", badgeClass: "border-panel bg-surface text-secondary" }
  if (days === 0) return { text: "Closes today", badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700" }
  if (days <= 3) return { text: `Closing in ${days} day${days === 1 ? "" : "s"}`, badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700" }
  if (days <= 7) return { text: `Closing in ${days} days`, badgeClass: "border-warning/40 bg-warning-soft text-warning" }
  return { text: `Closing in ${days} days`, badgeClass: "border-panel bg-surface text-secondary" }
}

export default function HelpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeRfq, setActiveRfq] = useState<ActiveRfq | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (!supabase) {
          if (!cancelled) {
            setLoadError("Workspace data is not configured.")
            setLoading(false)
          }
          return
        }

        const profile = await getCurrentProfile()
        if (!profile?.id) {
          router.replace("/auth/login")
          return
        }

        const normalizedRole = String(profile.role ?? "").trim().toLowerCase()
        const resolvedRole: Role = normalizedRole === "admin" ? "admin" : normalizedRole === "buyer" ? "buyer" : "supplier"
        const isBuyerSide = resolvedRole === "buyer" || resolvedRole === "admin"

        if (cancelled) return
        setUserId(profile.id)
        setRole(resolvedRole)

        const params = new URLSearchParams(window.location.search)
        const rfqIdParam = params.get("rfqId")

        let resolved: ActiveRfq | null = null

        if (rfqIdParam) {
          const { data } = await supabase
            .from("rfqs")
            .select("id, title, buyer_org, category, closing_date, status")
            .eq("id", rfqIdParam)
            .maybeSingle()
          if (data) resolved = toActiveRfq(data as RfqRow)
        } else if (isBuyerSide) {
          const { data } = await supabase
            .from("rfqs")
            .select("id, title, buyer_org, category, closing_date, status")
            .eq("buyer_id", profile.id)
            .order("closing_date", { ascending: true })
            .limit(20)
          const candidate = ((data ?? []) as RfqRow[]).find((row) =>
            OPEN_STATUSES.has(String(row.status ?? "").trim().toLowerCase())
          )
          if (candidate) resolved = toActiveRfq(candidate)
        } else {
          const { data: quoteRows } = await supabase
            .from("quotes")
            .select("rfq_id, status")
            .eq("supplier_id", profile.id)

          const inProgressRfqIds = (quoteRows ?? [])
            .filter((q) => !["awarded", "rejected", "declined"].includes(String(q.status ?? "").trim().toLowerCase()))
            .map((q) => q.rfq_id)

          if (inProgressRfqIds.length > 0) {
            const { data } = await supabase
              .from("rfqs")
              .select("id, title, buyer_org, category, closing_date, status")
              .in("id", inProgressRfqIds)
              .order("closing_date", { ascending: true })
              .limit(1)
              .maybeSingle()
            if (data) resolved = toActiveRfq(data as RfqRow)
          }

          if (!resolved) {
            const matches = await getSupplierMatches(profile.id)
            const top = matches.filter((m) => m.match_score >= 40).sort((a, b) => b.match_score - a.match_score)[0]
            if (top) {
              resolved = {
                id: Number(top.rfq.id),
                title: top.rfq.title ?? `RFQ-${top.rfq.id}`,
                buyerOrg: null,
                category: top.rfq.category ?? null,
                closingDate: top.rfq.deadline ?? null,
              }
            }
          }
        }

        if (!cancelled) setActiveRfq(resolved)
      } catch (error) {
        console.error("RFQ Action Assistant load failed:", error)
        if (!cancelled) setLoadError("We couldn't load your workspace data. The assistant is still available below.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const rfqDetailHref = activeRfq
    ? role === "buyer" || role === "admin"
      ? `/dashboard/buyer/rfqs/${activeRfq.id}`
      : `/dashboard/rfqs/${activeRfq.id}`
    : role === "buyer" || role === "admin"
    ? "/dashboard/buyer/rfqs"
    : "/dashboard/rfqs"

  const days = activeRfq ? daysUntil(activeRfq.closingDate) : null
  const badge = urgency(days)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-panel">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.15]"
          style={{
            background: "url('https://design.canva.ai/GB320ny3MyEuntW') center / cover no-repeat",
          }}
        />
        <div className="relative z-[1] p-6 md:p-8">
          <p className="mb-3 text-xs md:text-sm uppercase tracking-[0.3em] text-accent">RFQ Action Assistant</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl md:text-4xl font-bold text-primary">
                {activeRfq ? activeRfq.title : "No active RFQ yet"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-secondary">
                {activeRfq
                  ? `${activeRfq.buyerOrg ?? activeRfq.category ?? "Procurement opportunity"} · ask Thuso to help you respond, review, or prepare documents.`
                  : "Browse open RFQs to get started — Thuso will pick up right where you left off."}
              </p>
              {activeRfq && (
                <p className="mt-2 text-xs text-muted">Closes {formatDeadline(activeRfq.closingDate)}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              {activeRfq && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${badge.badgeClass}`}>
                  {badge.text}
                </span>
              )}
              <Link
                href={rfqDetailHref}
                className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-button transition hover:bg-accent-strong"
              >
                {activeRfq ? "View full RFQ" : "Browse RFQs"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <LoadingState isLoading={loading} error={loadError} loadingMessage="Loading your workspace...">
          <ThsuoWorkspace rfqId={activeRfq?.id} userId={userId ?? undefined} />
        </LoadingState>
      </ErrorBoundary>
    </div>
  )
}
