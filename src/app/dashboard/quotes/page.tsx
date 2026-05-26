import { Suspense } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Quote = {
  id: number
  rfq_id: number | null
  supplier_name: string
  amount: string
  status: string
  created_at: string | null
  submitted_at: string | null
  message: string | null
  supplier_id: string | null
}

const statusStyles: Record<string, string> = {
  Pending: "border-warning bg-warning-soft text-warning",
  Approved: "border-success bg-success-soft text-success",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-200",
  "Under Review": "border-sky-500/25 bg-sky-500/10 text-sky-200",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatAmount(amount: string): string {
  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`
}

async function QuotesTable() {
  if (!supabase) {
    return (
      <div className="rounded-md border border-panel bg-card p-12 text-center">
        <p className="text-sm text-secondary">Supabase is not configured.</p>
      </div>
    )
  }

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("id", { ascending: false })

  if (error) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 p-6">
        <p className="text-sm font-medium text-rose-200">Failed to load quotes</p>
        <p className="mt-1 text-xs text-rose-200/70">{error.message}</p>
      </div>
    )
  }

  const quotes = (data ?? []) as Quote[]

  if (quotes.length === 0) {
    return (
      <div className="rounded-md border border-panel bg-card p-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-panel bg-panel">
          <svg
            className="h-5 w-5 text-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-heading">No quotes found</p>
        <p className="mt-1 text-xs text-muted">
          Supplier quotes submitted through the platform will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-panel bg-panel">
              <th className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                RFQ ID
              </th>
              <th className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Supplier Name
              </th>
              <th className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Quoted Amount (ZAR)
              </th>
              <th className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Status
              </th>
              <th className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Created At
              </th>
              <th className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel">
            {quotes.map((quote) => (
              <tr key={quote.id} className="transition-colors hover:bg-surface">
                <td className="px-5 py-4">
                  <span className="font-mono text-xs text-accent">
                    {quote.rfq_id != null ? `RFQ-${quote.rfq_id}` : "—"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-medium text-heading">{quote.supplier_name}</span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-heading">{formatAmount(quote.amount)}</span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${
                      statusStyles[quote.status] ?? "border-panel bg-panel text-secondary"
                    }`}
                  >
                    {quote.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-secondary">
                  {formatDate(quote.created_at ?? quote.submitted_at)}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/dashboard/messages?receiver_role=buyer-admin&rfq_id=${quote.rfq_id ?? ""}&quote_id=${quote.id}&subject=${encodeURIComponent(`Quote Q-${quote.id} question`)}`}
                    className="inline-flex whitespace-nowrap rounded-md border border-accent bg-accent px-3 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
                  >
                    Message Buyer/Admin
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-panel px-5 py-3">
        <p className="text-xs text-muted">
          {quotes.length} quote{quotes.length !== 1 ? "s" : ""} total
        </p>
      </div>
    </div>
  )
}

function QuotesTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
      <div className="border-b border-panel bg-panel px-5 py-3.5">
        <div className="flex gap-12">
          {[80, 128, 72, 80, 96].map((w, i) => (
            <div
              key={i}
              className="h-2.5 animate-pulse rounded bg-surface"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
      <div className="divide-y divide-panel">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-12 px-5 py-4">
            {[56, 120, 80, 72, 96].map((w, j) => (
              <div
                key={j}
                className="h-3.5 animate-pulse rounded bg-panel"
                style={{ width: w }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function QuotesPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Submitted quotes</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Quote tracking</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Monitor supplier proposals and procurement responses in a structured enterprise list.
        </p>
      </div>

      <Suspense fallback={<QuotesTableSkeleton />}>
        <QuotesTable />
      </Suspense>
    </div>
  )
}
