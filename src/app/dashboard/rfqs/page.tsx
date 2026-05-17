import Link from "next/link"
import { rfqs, type Rfq } from "@/data/rfqs"

export default function RFQsPage() {
  return (
    <>

      <h1 className="text-5xl font-bold">
        Procurement Opportunities
      </h1>

      <p className="mt-4 text-gray-400">
        Browse active RFQs from mining, Eskom, and infrastructure buyers.
      </p>

      <div className="mt-10 space-y-6">

        {rfqs.map((rfq: Rfq) => (
          <div
            key={rfq.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-3xl font-semibold">
                  {rfq.title}
                </h2>

                <p className="mt-3 text-gray-400">
                  {rfq.description}
                </p>

              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm ${
                  rfq.status === "Open"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {rfq.status}
              </span>

            </div>

            <div className="mt-6 flex gap-4 text-sm text-gray-400">

              <p>Region: {rfq.region}</p>

              <p>Category: {rfq.category}</p>

              <p>Budget: {rfq.budget}</p>

            </div>

            <Link
              href={`/dashboard/rfqs/${rfq.id}`}
              className="mt-6 inline-block rounded-2xl bg-green-500 px-6 py-3 font-semibold text-black transition hover:bg-green-400"
            >
              View RFQ
            </Link>

          </div>
        ))}

      </div>

    </>
  )
}
