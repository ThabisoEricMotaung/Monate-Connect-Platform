import Link from "next/link"
import { getQuotes } from "@/lib/quotes"

const statusStyles: Record<string, string> = {
  Pending: "border-warning bg-warning-soft text-warning",
  Approved: "border-success bg-success-soft text-success",
  Rejected: "border-rose-500/25 bg-rose-500/10 text-rose-200",
  "Under Review": "border-sky-500/25 bg-sky-500/10 text-sky-200",
}

export default async function QuotesPage() {

  const quotes = await getQuotes()

  return (
    <div>

      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Submitted quotes
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Quote tracking
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Monitor supplier proposals and procurement responses in a structured enterprise list.
        </p>
      </div>

      <div className="space-y-4">
        {quotes.map((quote: any) => (
          <article
            key={quote.id}
            className="rounded-md border border-panel bg-card p-5 shadow-panel transition duration-150 hover:border-accent hover-surface"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                  Quote #{quote.id}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-8 text-heading">
                  {quote.rfqs?.title || "Quote record"}
                </h2>
                <p className="mt-2 text-sm text-secondary">
                  Supplier: <span className="font-medium text-heading">{quote.supplier_name}</span>
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusStyles[quote.status] ?? "border-panel bg-panel text-secondary"}`}>
                  {quote.status}
                </span>
                <p className="text-sm text-muted">Operational response record</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  RFQ reference
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">{quote.rfqs?.id ?? "N/A"}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Supplier
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">{quote.supplier_name}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Amount
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">{quote.amount}</p>
              </div>
              <div className="rounded-md border border-panel bg-panel p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Submitted
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">{quote.submitted_at ?? "Not available"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-md border border-panel bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Submitted message
                </p>
                <span className="text-xs text-muted">Operational note</span>
              </div>
              <p className="mt-2 text-sm leading-7 text-secondary">{quote.message || "No message provided."}</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-panel pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-secondary">Procurement workflow</p>
                <p className="text-sm text-muted">Track status changes from submission to review.</p>
              </div>
              <Link
                href={`/dashboard/rfqs/${quote.rfqs?.id}`}
                className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
              >
                View RFQ
              </Link>
            </div>
          </article>
        ))}
      </div>

    </div>
  )
}
