"use client"

import { useEffect, useState } from "react"
import {
  createRFQQuestion,
  getRFQQuestions,
  type RFQQuestion,
} from "@/lib/rfqQuestions"

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function RFQClarifications({ rfqId }: { rfqId: number }) {
  const [questions, setQuestions] = useState<RFQQuestion[]>([])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadQuestions() {
      try {
        setQuestions(await getRFQQuestions(rfqId))
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Clarifications failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [rfqId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!question.trim()) {
      setErrorMessage("Please enter a question before submitting.")
      return
    }

    setSubmitting(true)

    try {
      const newQuestion = await createRFQQuestion({
        rfq_id: rfqId,
        question,
      })

      setQuestions((currentQuestions) => [newQuestion, ...currentQuestions])
      setQuestion("")
      setSuccessMessage("Question submitted for buyer response.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Question submission failed."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      id="rfq-clarifications"
      className="mt-8 rounded-md border border-panel bg-card p-6 shadow-panel"
    >
      <div className="border-b border-panel pb-4">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
          RFQ Clarifications
        </p>
        <h2 className="mt-2 text-xl font-semibold text-heading">
          Questions and buyer responses
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">
          Ask procurement questions before submitting your quote and review
          published buyer responses.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mt-5 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5">
        <label
          htmlFor="rfq-question"
          className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
        >
          Supplier Question
        </label>
        <textarea
          id="rfq-question"
          rows={4}
          placeholder="Ask a clarification question about scope, timing, documents, compliance, or submission requirements..."
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value)
            setErrorMessage("")
            setSuccessMessage("")
          }}
          className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={submitting}
          className="mt-3 inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Question"}
        </button>
      </form>

      <div className="mt-6 border-t border-panel pt-5">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-md bg-panel"
              />
            ))}
          </div>
        )}

        {!loading && questions.length === 0 && (
          <div className="rounded-md border border-panel bg-panel p-8 text-center">
            <p className="text-sm font-semibold text-heading">No questions yet.</p>
            <p className="mt-2 text-xs text-muted">
              Supplier questions and buyer responses will appear here.
            </p>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((item) => (
              <article
                key={item.id}
                className="rounded-md border border-panel bg-panel p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-semibold leading-6 text-heading">
                    {item.question}
                  </p>
                  <span className="whitespace-nowrap text-xs text-muted">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>

                {item.answer ? (
                  <div className="mt-4 rounded-md border border-success bg-success-soft px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-success">
                      Buyer Answer
                    </p>
                    <p className="mt-2 text-sm leading-7 text-heading">
                      {item.answer}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-warning bg-warning-soft px-4 py-3">
                    <p className="text-sm font-semibold text-warning">
                      Awaiting buyer response
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
