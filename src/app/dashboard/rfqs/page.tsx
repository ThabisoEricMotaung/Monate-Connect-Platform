import Link from "next/link"
import { getRFQs } from "@/lib/rfqs"

export default async function RFQsPage() {

  const rfqs = await getRFQs()

  return (
    <div>

      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement opportunities
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Active RFQs
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary">
          Browse active requests for quotes from mining, municipal, and infrastructure buyers.
        </p>
      </div>

      <div className="space-y-5">
        {rfqs.map((rfq: any) => (
          <article
            key={rfq.id}
            className="rounded-md border border-panel bg-card p-5 shadow-panel transition duration-150 hover:border-accent hover-surface"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                  RFQ #{rfq.id}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-8 text-primary">
                  {rfq.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
                  {rfq.description}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span
                  className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
                    rfq.status === "Open"
                      ? "border-accent-soft bg-accent-soft text-accent"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {rfq.status}
                </span>
                <p className="text-sm font-medium text-muted">
                  Submission window open
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-panel bg-surface p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Region
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">{rfq.region}</p>
              </div>
              <div className="rounded-md border border-panel bg-surface p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Category
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">{rfq.category}</p>
              </div>
              <div className="rounded-md border border-panel bg-surface p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Budget
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">{rfq.budget}</p>
              </div>
              <div className="rounded-md border border-panel bg-surface p-4">
                <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
                  Submission action
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">View detail to quote</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-panel pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-secondary">
                Review procurement details and submit your quote through the vendor portal.
              </p>
              <Link
                href={`/dashboard/rfqs/${rfq.id}`}
                className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong"
              >
                Submit Quote
              </Link>
            </div>
          </article>
        ))}
      </div>

    </div>
  )
}