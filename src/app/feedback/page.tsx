"use client"

import { useState, type FormEvent } from "react"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"
import { supabase } from "@/lib/supabase"

const feedbackTypes = ["Bug", "Confusing", "Suggestion", "Praise"]
const priorities = ["Low", "Normal", "High", "Urgent"]

const initialForm = {
  tester_name: "",
  tester_role: "",
  page_or_feature: "",
  feedback_type: "Suggestion",
  rating: "5",
  priority: "Normal",
  message: "",
}

function getFeedbackErrorMessage(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? ""

  if (
    error?.code === "42P01" ||
    message.includes("pilot_feedback") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  ) {
    return "Feedback could not be saved because the pilot feedback table is not available yet. Ask an admin to run database/migrations/schema_stabilization_v2.sql, then try again."
  }

  return message || "Feedback could not be submitted. Please try again."
}

export default function FeedbackPage() {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
    setError("")
    setSuccess("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess("")

    if (!supabase) {
      setError("Feedback capture is not configured yet.")
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from("pilot_feedback").insert([
      {
        tester_name: form.tester_name.trim(),
        tester_role: form.tester_role.trim(),
        page_or_feature: form.page_or_feature.trim(),
        feedback_type: form.feedback_type,
        rating: Number(form.rating),
        priority: form.priority,
        message: form.message.trim(),
        status: "New",
      },
    ])

    if (insertError) {
      setError(getFeedbackErrorMessage(insertError))
      setSubmitting(false)
      return
    }

    setSuccess("Thank you. Your feedback has been captured for the pilot team.")
    setForm(initialForm)
    setSubmitting(false)
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page px-5 py-10 text-primary sm:px-6">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="entry-paper-panel">
            <p className="newspaper-kicker">Pilot Feedback</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-heading md:text-5xl">
              Help shape Monate Connect.
            </h1>
            <p className="mt-5 text-sm leading-7 text-secondary">
              Share what worked, what felt confusing, and what should improve before
              the next pilot review. Structured feedback helps the team prioritise
              fixes without losing the detail that testers notice first.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-secondary" htmlFor="tester_name">
                  Tester name
                </label>
                <input
                  id="tester_name"
                  value={form.tester_name}
                  onChange={(event) => updateField("tester_name", event.target.value)}
                  className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary" htmlFor="tester_role">
                  Tester role
                </label>
                <input
                  id="tester_role"
                  value={form.tester_role}
                  onChange={(event) => updateField("tester_role", event.target.value)}
                  className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                  placeholder="Supplier, buyer, admin, tester"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary" htmlFor="page_or_feature">
                  Page or feature
                </label>
                <input
                  id="page_or_feature"
                  value={form.page_or_feature}
                  onChange={(event) => updateField("page_or_feature", event.target.value)}
                  className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                  placeholder="Matching, login, RFQ detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary" htmlFor="feedback_type">
                  Feedback type
                </label>
                <select
                  id="feedback_type"
                  value={form.feedback_type}
                  onChange={(event) => updateField("feedback_type", event.target.value)}
                  className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                >
                  {feedbackTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary" htmlFor="rating">
                  Rating
                </label>
                <select
                  id="rating"
                  value={form.rating}
                  onChange={(event) => updateField("rating", event.target.value)}
                  className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                >
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={String(rating)}>{rating}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary" htmlFor="priority">
                  Priority
                </label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={(event) => updateField("priority", event.target.value)}
                  className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-accent"
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-secondary" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                required
                rows={7}
                className="mt-2 w-full rounded-md border border-panel bg-surface px-4 py-3 text-sm leading-7 text-primary outline-none focus:border-accent"
                placeholder="Tell us what happened, what you expected, and what would make it clearer."
              />
            </div>

            {success && (
              <div className="mt-5 rounded-md border border-success/30 bg-success-soft px-4 py-3">
                <p className="text-sm font-semibold text-success">{success}</p>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full rounded-md border border-accent bg-accent px-5 py-3 text-sm font-bold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting feedback..." : "Submit Feedback"}
            </button>
          </form>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
