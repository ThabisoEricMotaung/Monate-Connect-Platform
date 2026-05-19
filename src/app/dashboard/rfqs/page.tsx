import Link from "next/link"
import { getRFQs } from "@/lib/rfqs"

export default async function RFQsPage() {

  const rfqs = await getRFQs()

  return (
    <div>

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
          Procurement opportunities
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Active RFQs
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Browse active requests for quotes from mining, municipal, and infrastructure buyers.
        </p>
      </div>

      <div className="space-y-4">
        {rfqs.map((rfq: any) => (
          <article
            key={rfq.id}
            className="rounded-lg border border-slate-700 bg-[#08120e] p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  RFQ #{rfq.id}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {rfq.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  {rfq.description}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  rfq.status === "Open"
                    ? "bg-green-500/15 text-green-300"
                    : "bg-yellow-500/15 text-yellow-300"
                }`}
              >
                {rfq.status}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-700 bg-[#07120f] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Region
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{rfq.region}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-[#07120f] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Category
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{rfq.category}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-[#07120f] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Budget
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{rfq.budget}</p>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href={`/dashboard/rfqs/${rfq.id}`}
                className="inline-flex rounded-md bg-green-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-green-400"
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