"use client"

import { useState } from "react"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
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
    deadline?: string | null
  }
}

function cleanAmountInput(value: string): string {
  return value.replace(/[^\d]/g, "")
}

function formatRand(amount: string): string {
  const cleanAmount = cleanAmountInput(amount)
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`
}

function formatDeadline(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function RFQDetailClient({
  rfq,
}: RFQDetailClientProps) {

  const [quoteAmount, setQuoteAmount] = useState("")
  const [message, setMessage] = useState("")
  const displayStatus = getRFQDisplayStatus(rfq.status, rfq.deadline)
  const isClosed = displayStatus === "Closed"

  const handleSubmitQuote = async () => {
    if (isClosed) {
      alert("This RFQ has closed and no longer accepts submissions.")
      return
    }

    try {

      await submitQuote({
        rfq_id: rfq.id,
        supplier_name: "AiForm Procure Electrical Services",
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
              displayStatus === "Open"
                ? "bg-sky-500/10 text-sky-700"
                : displayStatus === "Closing Soon"
                  ? "bg-warning-soft text-warning"
                  : displayStatus === "Awarded"
                    ? "bg-success-soft text-success"
                    : "bg-rose-500/10 text-rose-700"
            }`}
          >
            {displayStatus}
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
              Deadline
            </p>

            <p className="mt-3 text-2xl font-semibold text-heading">
              {formatDeadline(rfq.deadline)}
            </p>

          </div>

          <div className="rounded-2xl border border-panel bg-panel p-6">

            <p className="text-lg text-secondary">
              Budget (ZAR)
            </p>

            <p className="mt-3 text-2xl font-semibold text-heading">
              {formatRand(rfq.budget)}
            </p>

          </div>

        </div>

      </div>

      <div className="rounded-3xl border border-panel bg-card p-10">

        <h2 className="text-5xl font-bold text-heading">
          Submit Your Quote
        </h2>

        <div className="mt-8 space-y-6">
          {isClosed && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-6 py-5">
              <p className="text-lg font-semibold text-rose-700">
                This RFQ has closed and no longer accepts submissions.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-lg text-secondary">
              Quoted Amount (ZAR)
            </label>
            <div className="flex overflow-hidden rounded-2xl border border-panel bg-panel transition focus-within:border-accent">
              <span className="flex items-center border-r border-panel bg-muted px-5 text-xl font-bold text-secondary">
                R
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="450000"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(cleanAmountInput(e.target.value))}
                disabled={isClosed}
                className="w-full bg-transparent px-6 py-5 text-xl text-heading outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Enter numbers only. Currency is applied automatically.
            </p>
          </div>

          <textarea
            placeholder="Describe your services, turnaround time, certifications, or experience..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isClosed}
            rows={6}
            className="w-full rounded-2xl border border-panel bg-panel px-6 py-5 text-xl text-heading outline-none transition focus:border-accent"
          />

          <button
            onClick={handleSubmitQuote}
            disabled={isClosed}
            className="rounded-2xl bg-accent px-10 py-5 text-xl font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isClosed ? "Submissions Closed" : "Submit Quote"}
          </button>

        </div>

      </div>

    </div>
  )
}
