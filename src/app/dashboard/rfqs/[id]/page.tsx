import Link from "next/link"
import { notFound } from "next/navigation"
import RFQClarifications from "@/components/rfqs/RFQClarifications"
import SaveRFQControl from "@/components/rfqs/SaveRFQControl"
import RFQIntelligence from "@/components/rfqs/RFQIntelligence"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

type Props = {
  params: Promise<{
    id: string
  }>
}

type RFQ = {
  id: number
  title: string
  description: string | null
  region: string | null
  province: string | null
  category: string | null
  budget: string | null
  status: string | null
  deadline: string | null
  attachment_url: string | null
}

const statusStyles: Record<string, string> = {
  Open: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Closed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Awarded: "border-success/30 bg-success-soft text-success",
}

function formatRand(amount: string | null): string {
  if (!amount) return "-"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function RFQDetailPage({ params }: Props) {

  const { id } = await params

  if (!supabase) {
    notFound()
  }

  const { data, error } = await supabase
    .from("rfqs")
    .select("*")
    .eq("id", Number(id))
    .single()

  if (error || !data) {
    notFound()
  }

  const rfq = data as RFQ
  const displayStatus = getRFQDisplayStatus(rfq.status, rfq.deadline)
  const isClosed = displayStatus === "Closed"

  return (

    <div className="mx-auto max-w-6xl">

      <div className="mb-8 border-b border-panel pb-6">

        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement Opportunity
        </p>

        <h1 className="mt-3 text-4xl font-semibold text-heading">
          {rfq.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${statusStyles[displayStatus] ?? "border-panel bg-panel text-secondary"}`}
          >
            {displayStatus}
          </span>
          <span className="text-sm font-medium text-secondary">
            Deadline: {formatDeadline(rfq.deadline)}
          </span>
        </div>

        {rfq.description && (
          <p className="mt-4 max-w-4xl text-sm leading-7 text-secondary">
            {rfq.description}
          </p>
        )}

      </div>

      <div className="grid gap-4 md:grid-cols-3">

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">

          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Region
          </p>

          <p className="mt-3 text-lg font-semibold text-heading">
            {rfq.region || rfq.province || "-"}
          </p>

        </div>

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">

          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Category
          </p>

          <p className="mt-3 text-lg font-semibold text-heading">
            {rfq.category || "-"}
          </p>

        </div>

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">

          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Budget (ZAR)
          </p>

          <p className="mt-3 text-lg font-semibold text-heading">
            {formatRand(rfq.budget)}
          </p>

        </div>

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel">

          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Deadline Status
          </p>

          <span
            className={`mt-3 inline-flex rounded-md border px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.18em] ${statusStyles[displayStatus] ?? "border-panel bg-panel text-secondary"}`}
          >
            {displayStatus}
          </span>

        </div>

        <div className="rounded-md border border-panel bg-card p-6 shadow-panel md:col-span-2">

          <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
            Deadline
          </p>

          <p className="mt-3 text-lg font-semibold text-heading">
            {formatDeadline(rfq.deadline)}
          </p>

        </div>

      </div>

      <div className="mt-8 rounded-md border border-panel bg-panel p-6 shadow-panel">

        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
          RFQ Brief
        </p>

        <h2 className="mt-2 text-xl font-semibold text-heading">
          Scope of Work
        </h2>

        <p className="mt-4 text-sm leading-7 text-secondary">
          {rfq.description || "Review the procurement information above and submit a competitive quote for consideration."}
        </p>

      </div>

      {rfq.attachment_url && (
        <div className="mt-8 rounded-md border border-panel bg-card p-6 shadow-panel">

          <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
            RFQ Documents
          </p>

          <h2 className="mt-2 text-xl font-semibold text-heading">
            Supporting attachment
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
            Download the attached procurement document for full RFQ details,
            supporting specifications, and submission context.
          </p>

          <a
            href={rfq.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
          >
            Download RFQ Attachment
          </a>

        </div>
      )}

      <RFQIntelligence
        title={rfq.title}
        description={rfq.description}
        category={rfq.category}
        province={rfq.province}
        budget={rfq.budget}
        deadline={rfq.deadline}
        attachment_url={rfq.attachment_url}
      />

      <RFQClarifications rfqId={rfq.id} />

      <div className="mt-8 flex flex-wrap gap-4 rounded-md border border-panel bg-card px-5 py-4">

        {isClosed ? (
          <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-3">
            <p className="text-sm font-semibold text-rose-700">
              This RFQ has closed and no longer accepts submissions.
            </p>
          </div>
        ) : (
          <Link
            href={`/dashboard/rfqs/${id}/submit`}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
          >
            Submit Quote
          </Link>
        )}

        <a
          href="#rfq-clarifications"
          className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          View Clarifications
        </a>

        <Link
          href={`/dashboard/messages?receiver_role=buyer-admin&rfq_id=${rfq.id}&subject=${encodeURIComponent(`RFQ-${rfq.id} question`)}`}
          className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          Message Buyer/Admin
        </Link>

        <Link
          href="/dashboard/rfqs"
          className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          Back to RFQs
        </Link>

        <SaveRFQControl rfqId={rfq.id} compact />

      </div>

    </div>

  )
}
