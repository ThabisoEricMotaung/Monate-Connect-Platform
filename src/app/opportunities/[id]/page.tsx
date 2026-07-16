import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import type { Metadata } from "next"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import CopyLinkButton from "./CopyLinkButton"

// Server-rendered detail page for a single public opportunity. The main
// /opportunities page is a client component (search/filter state), which
// means link-preview bots (WhatsApp, LinkedIn, Slack) and search engines see
// an empty shell when someone shares that URL — there's nothing to unfurl.
// This page exists so a single tender has a real, crawlable URL with proper
// title/description/OG tags, so sharing one opportunity actually shows the
// opportunity, not a generic homepage-style preview.

type Props = {
  params: Promise<{ id: string }>
}

type PublicRFQDetail = {
  id: number
  title: string | null
  description: string | null
  province: string | null
  provinces: string[] | null
  category: string | null
  industry: string | null
  budget: string | number | null
  estimated_value_min: number | null
  estimated_value_max: number | null
  closing_date: string | null
  published_date: string | null
  created_at: string | null
  status: string | null
  buyer_name: string | null
  buyer_org: string | null
  bbbee_requirement: string | null
  is_external_opportunity: boolean | null
  original_source_url: string | null
  source_name: string | null
}

const SITE_URL = "https://www.aiformprocure.co.za"

function supabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
}

async function getOpportunity(id: string): Promise<PublicRFQDetail | null> {
  const numericId = Number(id)
  if (!Number.isFinite(numericId)) return null

  const supabase = supabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("rfqs")
    .select(
      "id,title,description,province,provinces,category,industry,budget,estimated_value_min,estimated_value_max,closing_date,published_date,created_at,status,buyer_name,buyer_org,bbbee_requirement,is_external_opportunity,original_source_url,source_name"
    )
    .eq("id", numericId)
    .eq("is_public", true)
    .maybeSingle()

  if (error || !data) return null
  return data as PublicRFQDetail
}

function formatBudget(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Value not disclosed"
  if (typeof value === "number") return `R${value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
  const num = Number(value.toString().replace(/[^\d.]/g, ""))
  if (Number.isNaN(num) || num === 0) return String(value)
  return `R${num.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`
}

function formatValueRange(rfq: PublicRFQDetail): string {
  const { estimated_value_min: min, estimated_value_max: max } = rfq
  if (typeof min === "number" && typeof max === "number") return `${formatBudget(min)} - ${formatBudget(max)}`
  if (typeof min === "number") return `From ${formatBudget(min)}`
  if (typeof max === "number") return `Up to ${formatBudget(max)}`
  return formatBudget(rfq.budget)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "TBC"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
}

function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadline.setHours(0, 0, 0, 0)
  return Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000)
}

function provinceLabel(rfq: PublicRFQDetail): string {
  const provinces = Array.isArray(rfq.provinces) ? rfq.provinces.filter(Boolean) : []
  return provinces.length > 0 ? provinces.join(", ") : rfq.province || "South Africa"
}

function industryLabel(rfq: PublicRFQDetail): string {
  return rfq.industry || rfq.category || "General procurement"
}

function buyerLabel(rfq: PublicRFQDetail): string {
  return rfq.buyer_org || rfq.buyer_name || "Verified buyer"
}

function plainSummary(rfq: PublicRFQDetail): string {
  const raw = (rfq.description ?? "").replace(/\s+/g, " ").trim()
  const base = raw || `${industryLabel(rfq)} opportunity in ${provinceLabel(rfq)}.`
  return base.length > 155 ? `${base.slice(0, 152)}...` : base
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const rfq = await getOpportunity(id)
  if (!rfq) return { title: "Opportunity not found - AiForm Procure" }

  const title = `${rfq.title ?? "Open tender"} - AiForm Procure`
  const description = plainSummary(rfq)
  const url = `${SITE_URL}/opportunities/${rfq.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: rfq.title ?? "Open tender",
      description,
      url,
      siteName: "AiForm Procure",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: rfq.title ?? "Open tender",
      description,
    },
  }
}

export default async function OpportunityDetailPage({ params }: Props) {
  const { id } = await params
  const rfq = await getOpportunity(id)
  if (!rfq) notFound()

  const daysLeft = daysUntil(rfq.closing_date)
  const isClosed = daysLeft !== null && daysLeft < 0
  const isExternal = Boolean(rfq.is_external_opportunity)
  const shareUrl = `${SITE_URL}/opportunities/${rfq.id}`

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-white text-primary">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-4">
            <BackLink />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-success/30 bg-success-soft px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-success">
              Verified buyer
            </span>
            {isExternal && (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-accent-strong">
                {rfq.source_name?.trim() || "External"}
              </span>
            )}
            {isClosed ? (
              <span className="rounded-full border border-panel bg-surface px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-muted">
                Closed
              </span>
            ) : daysLeft !== null && daysLeft <= 3 ? (
              <span className="rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-warning">
                Closing soon
              </span>
            ) : null}
          </div>

          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-accent">
            {industryLabel(rfq)}
          </p>
          <h1 className="newspaper-headline mb-2">{rfq.title ?? "Untitled opportunity"}</h1>
          <p className="mb-6 text-sm text-secondary">Issued by {buyerLabel(rfq)}</p>

          <div className="mb-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-3 py-1 text-xs text-secondary">
              {provinceLabel(rfq)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-3 py-1 text-xs text-secondary">
              {formatValueRange(rfq)}
            </span>
            {rfq.bbbee_requirement && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-3 py-1 text-xs text-secondary">
                BBBEE {rfq.bbbee_requirement}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-panel bg-surface px-3 py-1 text-xs text-secondary">
              Closes {formatDate(rfq.closing_date)}
            </span>
          </div>

          <div className="mb-8 rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="whitespace-pre-line text-sm leading-relaxed text-secondary">
              {rfq.description || "No further description was provided for this opportunity."}
            </p>
          </div>

          <div className="mb-8 rounded-lg border border-accent/20 bg-accent/5 p-5">
            {isExternal && rfq.original_source_url ? (
              <>
                <p className="mb-1.5 text-sm font-semibold text-heading">Externally-sourced opportunity</p>
                <p className="mb-4 text-sm text-secondary">
                  Source: {rfq.source_name?.trim() || "External"}. Quotes for this opportunity are submitted
                  directly with the buyer, not through AiForm Procure.
                </p>
                <a
                  href={rfq.original_source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="masthead__btn-primary text-sm"
                >
                  View original tender
                </a>
              </>
            ) : (
              <>
                <p className="mb-1.5 text-sm font-semibold text-heading">Register to respond</p>
                <p className="mb-4 text-sm text-secondary">
                  Create a free supplier account to submit a quote, track this deadline, and get matched to
                  similar opportunities.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/auth/signup" className="masthead__btn-primary text-sm">
                    Create free account
                  </Link>
                  <Link href="/auth/login" className="masthead__btn-secondary text-sm">
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-panel pt-5">
            <p className="text-xs text-muted">Know a supplier who&apos;d want this one?</p>
            <CopyLinkButton url={shareUrl} title={rfq.title ?? undefined} />
            <Link href="/opportunities" className="text-xs font-semibold text-accent hover:underline">
              Browse all open opportunities &rarr;
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
