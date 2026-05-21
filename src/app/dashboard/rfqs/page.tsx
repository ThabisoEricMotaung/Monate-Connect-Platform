import Link from "next/link"
import { rfqs } from "@/data/rfqs"

export default function RFQsPage() {

  return (

    <div className="mx-auto max-w-7xl">

      <div className="mb-12">

        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Procurement Opportunities
        </p>

        <h1 className="mt-4 text-5xl font-bold text-slate-900 dark:text-white">
          Active RFQs
        </h1>

        <p className="mt-6 max-w-4xl text-xl leading-relaxed text-slate-600 dark:text-slate-300">
          Browse active requests for quotations from mining,
          infrastructure, municipal, and industrial procurement buyers.
        </p>

      </div>

      <div className="space-y-8">

        {rfqs.map((rfq) => (

          <div
            key={rfq.id}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition dark:border-white/10 dark:bg-slate-900"
          >

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

              <div className="max-w-4xl">

                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  RFQ #{rfq.id}
                </p>

                <h2 className="mt-4 text-4xl font-bold text-slate-900 dark:text-white">
                  {rfq.title}
                </h2>

                <p className="mt-6 text-xl leading-relaxed text-slate-600 dark:text-slate-300">
                  {rfq.description}
                </p>

              </div>

              <div>

                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  Open
                </span>

              </div>

            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-4">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-800/60">

                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Province
                </p>

                <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
                  {rfq.region}
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-800/60">

                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Category
                </p>

                <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
                  {rfq.category}
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-800/60">

                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Budget
                </p>

                <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
                  {rfq.budget}
                </p>

              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-800/60">

                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Submission
                </p>

                <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
                  Active
                </p>

              </div>

            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-slate-200 pt-8 dark:border-white/10">

              <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
                Review procurement specifications, supplier requirements,
                and operational expectations before submitting your quote.
              </p>

              <Link
                href={`/dashboard/rfqs/${rfq.id}`}
                className="rounded-2xl bg-[#556B88] px-6 py-3 text-lg font-semibold text-white transition hover:opacity-90"
              >
                View RFQ
              </Link>

            </div>

          </div>

        ))}

      </div>

    </div>

  )
}