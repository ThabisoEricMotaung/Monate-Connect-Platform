"use client"

import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
import { useState } from "react"

export default function SubmitQuotePage() {
  const params = useParams<{ id: string }>()
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [quotedAmount, setQuotedAmount] = useState("")
  const [deliveryTimeline, setDeliveryTimeline] = useState("")
  const [scope, setScope] = useState("")
  const [supportingNotes, setSupportingNotes] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(false)
    setErrorMessage("")

    if (!supabase) {
      setErrorMessage("Supabase environment variables are not configured.")
      return
    }

    const { error } = await supabase
      .from("quotes")
      .insert([
        {
          rfq_id: Number(params.id),
          supplier_name: "Monate Electrical Services",
          amount: quotedAmount,
          timeline: deliveryTimeline,
          scope,
          supporting_notes: supportingNotes,
          status: "Pending",
        },
      ])

    if (error) {
      console.error(error)
      setErrorMessage(error.message)
      return
    }

    setSubmitted(true)
  }

  return (
    <section className="enterprise-main-panel">
      <div className="enterprise-breadcrumbs">
        Home / Dashboard / RFQs / Submit Quote
      </div>

      <div className="enterprise-section-heading">
        <p className="enterprise-section-label">
          Procurement Submission
        </p>

        <h1 className="enterprise-page-title">
          Submit Supplier Quote
        </h1>

        <p className="enterprise-page-description">
          Submit pricing, delivery timelines, and
          supporting procurement documentation for
          enterprise review.
        </p>
      </div>

      <div className="enterprise-card">
        <form onSubmit={handleSubmit}>
          <div className="enterprise-grid enterprise-grid-2">
            <div className="enterprise-field">
              <label>
                Quoted Amount (ZAR)
              </label>

              <input
                type="number"
                placeholder="450000"
                className="enterprise-input"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
              />
            </div>

            <div className="enterprise-field">
              <label>
                Estimated Delivery Timeline
              </label>

              <input
                type="text"
                placeholder="14 working days"
                className="enterprise-input"
                value={deliveryTimeline}
                onChange={(e) => setDeliveryTimeline(e.target.value)}
              />
            </div>
          </div>

          <div className="enterprise-field">
            <label>Services / Scope</label>

            <textarea
              rows={6}
              placeholder="Describe supplied services, compliance readiness, certifications, labour capacity, and procurement deliverables..."
              className="enterprise-textarea"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>

          <div className="enterprise-field">
            <label>Supporting Notes</label>

            <textarea
              rows={4}
              placeholder="Optional procurement notes..."
              className="enterprise-textarea"
              value={supportingNotes}
              onChange={(e) => setSupportingNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="enterprise-primary-button"
          >
            Submit Enterprise Quote
          </button>
        </form>

        {submitted && (
          <div className="enterprise-success-banner">
            Quote submitted successfully for
            procurement review.
          </div>
        )}

        {errorMessage && (
          <div className="enterprise-success-banner">
            {errorMessage}
          </div>
        )}
      </div>
    </section>
  )
}
