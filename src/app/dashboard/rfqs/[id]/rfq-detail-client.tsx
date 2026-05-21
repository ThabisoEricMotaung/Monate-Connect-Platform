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

      <div className="rounded-3xl border border-panel bg-card p-10">

        <div className="flex items-start justify-between">

          <div>

            <h1 className="text-6xl font-bold text-heading">
              {rfq.title}
            </h1>

            <p className="mt-6 text-2xl text-secondary">
              {rfq.description}
            </p>

          </div>

          <span
            className={`rounded-full px-6 py-3 text-lg ${
              rfq.status === "Open"
                ? "bg-accent-soft text-accent"
                : "bg-warning-soft text-warning"
            }`}
          >
            {rfq.status}
          </span>

        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">

          <div className="rounded-2xl border border-panel bg-panel p-6">

            <p className="text-lg text-secondary">
              Region
            </p>

            <p className="mt-3 text-2xl font-semibold text-heading">
              {rfq.region}
            </p>

          </div>

          <div className="rounded-2xl border border-panel bg-panel p-6">

            <p className="text-lg text-secondary">
              Category
            </p>

            <p className="mt-3 text-2xl font-semibold text-heading">
              {rfq.category}
            </p>

          </div>

          <div className="rounded-2xl border border-panel bg-panel p-6">

            <p className="text-lg text-secondary">
              Budget
            </p>

            <p className="mt-3 text-2xl font-semibold text-heading">
              {rfq.budget}
            </p>

          </div>

        </div>

      </div>

      <div className="rounded-3xl border border-panel bg-card p-10">

        <h2 className="text-5xl font-bold text-heading">
          Submit Your Quote
        </h2>

        <div className="mt-8 space-y-6">

          <input
            type="text"
            placeholder="Quote Amount"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            className="w-full rounded-2xl border border-panel bg-panel px-6 py-5 text-xl text-heading outline-none transition focus:border-accent"
          />

          <textarea
            placeholder="Describe your services, turnaround time, certifications, or experience..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-2xl border border-panel bg-panel px-6 py-5 text-xl text-heading outline-none transition focus:border-accent"
          />

          <button
            onClick={handleSubmitQuote}
            className="rounded-2xl bg-accent px-10 py-5 text-xl font-semibold text-button transition hover:bg-accent-strong"
          >
            Submit Quote
          </button>

        </div>

      </div>

    </div>
  )
}