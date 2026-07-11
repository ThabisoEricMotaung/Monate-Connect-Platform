"use client"

import {
  IconAntenna,
  IconChartBar,
  IconChevronDown,
  IconFilePlus,
  IconSearch,
  type TablerIcon,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { applySupplierDocuments, fetchSupplierDocumentsForProfile } from "@/lib/supplierDocuments"

type ProcurementWireScope = "public" | "dashboard"

type LiveRFQ = {
  id: number
  title: string | null
  budget: string | number | null
  deadline: string | null
}

type WireProfile = {
  id?: string
  smart_score?: number | string | null
  csd_number?: string | null
  bbbee_level?: string | null
  tax_document_url?: string | null
  tax_clearance_url?: string | null
}

type WireStats = {
  openRfqs: number
  pendingQuotes: number
}

const WIRE_OPEN_KEY = "wire-open"

function formatBudget(value: string | number | null) {
  if (value == null || value === "") return "Budget TBC"
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(value)
  }
  return value
}

function daysLeft(deadline: string | null) {
  if (!deadline) return "Closing date TBC"
  const end = new Date(deadline)
  if (Number.isNaN(end.getTime())) return "Closing date TBC"
  const diff = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return "Closed"
  if (diff === 0) return "Closes today"
  if (diff === 1) return "1 day left"
  return `${diff} days left`
}

function missingSmartScoreStep(profile: WireProfile | null) {
  if (!profile?.csd_number) return "add your CSD number"
  if (!profile.bbbee_level) return "add your BBBEE level"
  if (!profile.tax_document_url && !profile.tax_clearance_url) return "upload tax clearance"
  return "verify banking details"
}

function toSmartScore(value: WireProfile["smart_score"]) {
  const score = Number(value ?? 0)
  return Number.isFinite(score) ? score : 0
}

export default function ProcurementWire({ scope = "public" }: { scope?: ProcurementWireScope }) {
  const pathname = usePathname() || "/"
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [liveRfqs, setLiveRfqs] = useState<LiveRFQ[]>([])
  const [stats, setStats] = useState<WireStats>({ openRfqs: 0, pendingQuotes: 0 })
  const [profile, setProfile] = useState<WireProfile | null>(null)

  const isDashboard = pathname.startsWith("/dashboard")
  const shouldRender = !pathname.startsWith("/auth/") && (
    scope === "dashboard" ? isDashboard : !isDashboard
  )
  const loggedIn = Boolean(sessionUserId)

  useEffect(() => {
    if (!shouldRender) return
    setOpen(window.localStorage.getItem(WIRE_OPEN_KEY) === "1")
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender) return
    let cancelled = false

    async function loadWireData() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      const userId = session?.user?.id ?? null
      setSessionUserId(userId)

      if (!userId) {
        const { data } = await supabase
          .from("rfqs")
          .select("id,title,budget,deadline,created_at")
          .ilike("status", "open")
          .order("created_at", { ascending: false })
          .limit(3)

        if (!cancelled) setLiveRfqs((data ?? []) as LiveRFQ[])
        return
      }

      const [openRfqsResult, pendingQuotesResult, profileResult] = await Promise.all([
        supabase.from("rfqs").select("id", { count: "exact", head: true }).ilike("status", "open"),
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("supplier_id", userId)
          .ilike("status", "pending"),
        supabase
          .from("profiles")
          .select(
            "id, smart_score, csd_number, bbbee_level, tax_document_url, tax_clearance_url",
          )
          .eq("id", userId)
          .maybeSingle(),
      ])

      if (cancelled) return

      setStats({
        openRfqs: openRfqsResult.count ?? 0,
        pendingQuotes: pendingQuotesResult.count ?? 0,
      })
      if (profileResult.data) {
        const documents = await fetchSupplierDocumentsForProfile(userId)
        if (!cancelled) setProfile(applySupplierDocuments(profileResult.data as WireProfile & { id: string }, documents.documents))
      } else {
        setProfile(null)
      }
    }

    loadWireData()

    return () => {
      cancelled = true
    }
  }, [shouldRender])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
      window.localStorage.setItem(WIRE_OPEN_KEY, "0")
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("touchstart", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("touchstart", handlePointerDown)
    }
  }, [open])

  function toggleOpen() {
    const nextOpen = !open
    setOpen(nextOpen)
    window.localStorage.setItem(WIRE_OPEN_KEY, nextOpen ? "1" : "0")
  }

  if (!shouldRender) return null

  const smartScore = toSmartScore(profile?.smart_score)
  const showSmartScoreNudge = loggedIn && smartScore < 90
  return (
    <>
      <div
        ref={panelRef}
        id="procurement-wire-panel"
        aria-hidden={!open}
        style={{
          position: "fixed",
          bottom: 72,
          left: "50%",
          transform: `translateX(-50%) translateY(${open ? "0" : "12px"})`,
          width: 340,
          maxWidth: "calc(100vw - 32px)",
          background: "#f8f4ec",
          border: "1px solid #e0d9cc",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          zIndex: 49,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease, transform 180ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #e0d9cc",
            marginBottom: 12,
            paddingBottom: 12,
          }}
        >
          <IconAntenna aria-hidden="true" color="#c8a060" size={18} stroke={1.8} />
          <p style={{ margin: 0, color: "#1a3a2a", fontSize: 13, fontWeight: 500, letterSpacing: "0.05em" }}>
            AIFORMS PROCUREMENT WIRE
          </p>
        </div>

        {loggedIn ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ border: "0.5px solid #e0d9cc", borderRadius: 8, background: "#ffffff", padding: 10 }}>
                <p style={{ margin: 0, color: "#888888", fontSize: 10, letterSpacing: "0.08em" }}>OPEN RFQS</p>
                <p style={{ margin: "4px 0 0", color: "#c8a060", fontSize: 20, fontWeight: 600 }}>{stats.openRfqs}</p>
              </div>
              <div style={{ border: "0.5px solid #e0d9cc", borderRadius: 8, background: "#ffffff", padding: 10 }}>
                <p style={{ margin: 0, color: "#888888", fontSize: 10, letterSpacing: "0.08em" }}>QUOTES PENDING</p>
                <p style={{ margin: "4px 0 0", color: "#c8a060", fontSize: 20, fontWeight: 600 }}>{stats.pendingQuotes}</p>
              </div>
            </div>

            <div>
              <p style={{ margin: "0 0 8px", color: "#888888", fontSize: 11, letterSpacing: "0.08em" }}>
                QUICK ACTIONS
              </p>
              <div style={{ display: "grid", gap: 6 }}>
                <WireAction href="/dashboard/buyer/rfqs/new" icon={IconFilePlus} label="New RFQ" />
                <WireAction href="/suppliers" icon={IconSearch} label="Find suppliers" />
                <WireAction href="/dashboard/spend-analysis" icon={IconChartBar} label="Spend analysis" />
              </div>
            </div>

            {showSmartScoreNudge && (
              <div>
                <p style={{ margin: "0 0 8px", color: "#888888", fontSize: 11, letterSpacing: "0.08em" }}>
                  SMARTSCORE NUDGE
                </p>
                <p
                  style={{
                    margin: 0,
                    background: "rgba(200,160,96,0.1)",
                    border: "1px solid rgba(200,160,96,0.3)",
                    borderRadius: 6,
                    padding: 8,
                    color: "#1a3a2a",
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  Complete {missingSmartScoreStep(profile)} to reach 90+ and unlock priority RFQ visibility.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 8px", color: "#888888", fontSize: 11, letterSpacing: "0.08em" }}>
              LIVE TENDERS
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {(liveRfqs.length ? liveRfqs : [{ id: 0, title: "No open RFQs yet", budget: null, deadline: null }]).map((rfq) => (
                <div
                  key={rfq.id}
                  style={{
                    background: "#ffffff",
                    border: "0.5px solid #e0d9cc",
                    borderRadius: 6,
                    padding: 8,
                  }}
                >
                  <p style={{ margin: 0, color: "#1a3a2a", fontSize: 12, lineHeight: 1.35 }}>
                    {rfq.title ?? "Untitled RFQ"}
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#c8a060", fontSize: 11 }}>
                    {formatBudget(rfq.budget)} - {daysLeft(rfq.deadline)}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/auth/signup"
              style={{
                display: "block",
                marginTop: 12,
                width: "100%",
                borderRadius: 8,
                background: "#1a3a2a",
                color: "#f0ebe0",
                padding: "9px 12px",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Register to respond &rarr;
            </Link>
          </div>
        )}
      </div>

      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls="procurement-wire-panel"
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1a3a2a",
          border: "none",
          borderRadius: 12,
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          zIndex: 50,
          cursor: "pointer",
        }}
      >
        <IconAntenna aria-hidden="true" color="#c8a060" size={18} stroke={1.8} />
        <span style={{ color: "#f0ebe0", fontSize: 12, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
          AIFORMS PROCUREMENT WIRE
        </span>
        <IconChevronDown
          aria-hidden="true"
          color="#9FE1CB"
          size={14}
          stroke={2}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }}
        />
      </button>
    </>
  )
}

function WireAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: TablerIcon
  label: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        borderRadius: 8,
        background: "#ffffff",
        border: "0.5px solid #e0d9cc",
        color: "#1a3a2a",
        padding: "9px 10px",
        textAlign: "left",
        textDecoration: "none",
        fontSize: 12,
      }}
    >
      <Icon aria-hidden="true" color="#c8a060" size={16} stroke={1.8} />
      <span>{label}</span>
    </Link>
  )
}
