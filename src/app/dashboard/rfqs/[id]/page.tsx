"use client"

import { useState } from "react"
import { rfqs, type Rfq } from "@/data/rfqs"
import { notFound } from "next/navigation"

type RFQDetailPageProps = {
  params: { id: string }
}

export default function RFQDetailPage({
  params,
}: RFQDetailPageProps) {

  const rfq: Rfq | undefined = rfqs.find(
    (item) => item.id === Number(params.id)
  )

  const [quote, setQuote] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (!rfq) {
    notFound()
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  return (
    <>

      <div className="mx-auto max-w-5xl">

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">

          <div className="flex items-center justify-between">

            <h1 className="text-5xl font-bold">
              {rfq.title}
            </h1>

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

          <p className="mt-6 text-xl text-gray-300">
            {rfq.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-gray-400">
                Region
              </p>

              <p className="mt-2 text-lg font-semibold">
                {rfq.region}
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-gray-400">
                Category
              </p>

              <p className="mt-2 text-lg font-semibold">
                {rfq.category}
              </p>

            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">

              <p className="text-gray-400">
                Budget
              </p>

              <p className="mt-2 text-lg font-semibold">
                {rfq.budget}
              </p>

            </div>

          </div>

        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8">

          <h2 className="text-3xl font-bold">
            Submit Your Quote
          </h2>

          <div className="mt-6 space-y-5">

            <input
              type="text"
              placeholder="Quote Amount"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none focus:border-green-500"
            />

            <textarea
              placeholder="Describe your services, turnaround time, certifications, or experience..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none focus:border-green-500"
            />

            <button
              onClick={handleSubmit}
              className="rounded-2xl bg-green-500 px-8 py-4 font-semibold text-black transition hover:bg-green-400"
            >
              Submit Proposal
            </button>

            {submitted && (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-400">
                Proposal submitted successfully.
              </div>
            )}

          </div>

        </div>

      </div>

    </>
  )
}