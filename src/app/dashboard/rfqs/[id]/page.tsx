import Link from "next/link"
import { notFound } from "next/navigation"
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

  return (

    <div className="mx-auto max-w-6xl">

      <div className="mb-8 border-b border-panel pb-6">

        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement Opportunity
        </p>

        <h1 className="mt-3 text-4xl font-semibold text-heading">
          {rfq.title}
        </h1>

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
            Status
          </p>

          <p className="mt-3 text-lg font-semibold text-accent">
            {rfq.status || "-"}
          </p>

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

      <div className="mt-8 flex flex-wrap gap-4 rounded-md border border-panel bg-card px-5 py-4">

        <Link
          href={`/dashboard/rfqs/${id}/submit`}
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
        >
          Submit Quote
        </Link>

        <Link
          href="/dashboard/rfqs"
          className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          Back to RFQs
        </Link>

      </div>

    </div>

  )
}
