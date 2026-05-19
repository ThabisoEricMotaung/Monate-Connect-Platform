"use client"

import { useState } from "react"
import { submitQuote } from "@/lib/quotes"

interface RFQDetailClientProps {
  rfq: {
    id: number
    title: string
    description: string
    region: string
    category: string
    budget: string
    status: string
  }
}

export default function RFQDetailClient({
  rfq,
}: RFQDetailClientProps) {

  const [quoteAmount, setQuoteAmount] = useState("")
  const [message, setMessage] = useState("")

  const handleSubmitQuote = async () => {

    try {

      await submitQuote({
        rfq_id: rfq.id,
        supplier_name: "Monate Electrical Services",
        amount: quoteAmount,
        message: message,
      })

      alert("Quote submitted successfully!")

      setQuoteAmount("")
      setMessage("")

    } catch (error) {

      console.error(error)

      alert("Failed to submit quote")
    }
  }

  return (
    <div className="space-y-10">

      <div className="rounded-3xl border border-white/10 bg-white/5 p-10">

        <div className="flex items-start justify-between">

          <div>

            <h1 className="text-6xl font-bold text-white">
              {rfq.title}
            </h1>

            <p className="mt-6 text-2xl text-gray-300">
              {rfq.description}
            </p>

          </div>

          <span
            className={`rounded-full px-6 py-3 text-lg ${
              rfq.status === "Open"
                ? "bg-green-500/20 text-green-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {rfq.status}
          </span>

        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">

            <p className="text-lg text-gray-400">
              Region
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {rfq.region}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">

            <p className="text-lg text-gray-400">
              Category
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {rfq.category}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">

            <p className="text-lg text-gray-400">
              Budget
            </p>

            <p className="mt-3 text-2xl font-semibold text-white">
              {rfq.budget}
            </p>

          </div>

        </div>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-10">

        <h2 className="text-5xl font-bold text-white">
          Submit Your Quote
        </h2>

        <div className="mt-8 space-y-6">

          <input
            type="text"
            placeholder="Quote Amount"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-5 text-xl text-white outline-none transition focus:border-green-500"
          />

          <textarea
            placeholder="Describe your services, turnaround time, certifications, or experience..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-5 text-xl text-white outline-none transition focus:border-green-500"
          />

          <button
            onClick={handleSubmitQuote}
            className="rounded-2xl bg-green-500 px-10 py-5 text-xl font-semibold text-black transition hover:bg-green-400"
          >
            Submit Quote
          </button>

        </div>

      </div>

    </div>
  )
}