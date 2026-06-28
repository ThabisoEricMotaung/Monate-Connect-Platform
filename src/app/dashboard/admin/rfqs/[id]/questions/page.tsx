"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import {
  answerRFQQuestion,
  getRFQQuestions,
  type RFQQuestion,
} from "@/lib/rfqQuestions"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string | null
}

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

export default function AdminRFQQuestionsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rfqId = Number(params.id)
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [questions, setQuestions] = useState<RFQQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [answeringId, setAnsweringId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    async function loadQuestions() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      if (!Number.isFinite(rfqId)) {
        setErrorMessage("Invalid RFQ reference.")
        setLoading(false)
        return
      }

      const { data: rfqData, error: rfqError } = await supabase
        .from("rfqs")
        .select("id, title")
        .eq("id", rfqId)
        .single()

      if (rfqError) {
        setErrorMessage(rfqError.message)
        setLoading(false)
        return
      }

      try {
        setRfq(rfqData as RFQ)
        setQuestions(await getRFQQuestions(rfqId))
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "RFQ questions failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [rfqId, router])

  async function handleAnswer(questionId: number) {
    const answer = answers[questionId]?.trim()

    setErrorMessage("")
    setSuccessMessage("")

    if (!answer) {
      setErrorMessage("Please enter an answer before marking the question answered.")
      return
    }

    setAnsweringId(questionId)

    try {
      const updatedQuestion = await answerRFQQuestion(questionId, answer)

      setQuestions((currentQuestions) =>
        currentQuestions.map((question) =>
          question.id === questionId ? updatedQuestion : question
        )
      )
      setAnswers((currentAnswers) => ({
        ...currentAnswers,
        [questionId]: "",
      }))
      if (updatedQuestion.supplier_id) {
        await createNotification({
          userId: updatedQuestion.supplier_id,
          type: "Clarification Response",
          title: "Clarification response published",
          message: `A buyer response was published for RFQ-${updatedQuestion.rfq_id}.`,
          link: `/dashboard/rfqs/${updatedQuestion.rfq_id}#rfq-clarifications`,
        })
      }
      setSuccessMessage("Question answered successfully.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Question answer failed."
      )
    } finally {
      setAnsweringId(null)
    }
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Admin / RFQ Clarifications
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Manage RFQ Questions
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review supplier clarification questions and publish buyer responses for
          RFQ #{rfqId}
          {rfq?.title ? `: ${rfq.title}` : ""}.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            RFQ questions failed
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-md border border-panel bg-card shadow-panel"
            />
          ))}
        </div>
      )}

      {!loading && !errorMessage && questions.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">No questions yet.</p>
          <p className="mt-2 text-xs text-muted">
            Supplier clarification questions will appear here once submitted.
          </p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-5">
          {questions.map((question) => (
            <article
              key={question.id}
              className="rounded-md border border-panel bg-card p-6 shadow-panel"
            >
              <div className="flex flex-col gap-4 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                    Supplier Question
                  </p>
                  <h2 className="mt-2 text-base font-semibold leading-7 text-heading">
                    {question.question}
                  </h2>
                  <p className="mt-2 text-xs text-muted">
                    Asked by {question.supplier_email || "Supplier"} on{" "}
                    {formatDateTime(question.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${
                    question.answer
                      ? "border-success bg-success-soft text-success"
                      : "border-warning bg-warning-soft text-warning"
                  }`}
                >
                  {question.answer ? "Answered" : "Awaiting buyer response"}
                </span>
              </div>

              {question.answer ? (
                <div className="mt-5 rounded-md border border-success bg-success-soft px-5 py-4">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-success">
                    Published Answer
                  </p>
                  <p className="mt-2 text-sm leading-7 text-heading">
                    {question.answer}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Answered {formatDateTime(question.answered_at)}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <label
                    htmlFor={`answer-${question.id}`}
                    className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
                  >
                    Buyer Answer
                  </label>
                  <textarea
                    id={`answer-${question.id}`}
                    rows={4}
                    placeholder="Provide a clear buyer response for all suppliers to reference..."
                    value={answers[question.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((currentAnswers) => ({
                        ...currentAnswers,
                        [question.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    disabled={answeringId === question.id}
                    onClick={() => handleAnswer(question.id)}
                    className="mt-3 inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {answeringId === question.id
                      ? "Publishing..."
                      : "Mark Answered"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-4 rounded-md border border-panel bg-card px-5 py-4 shadow-panel">
        <Link
          href={`/dashboard/admin/rfqs/${rfqId}/quotes`}
          className="inline-flex items-center justify-center rounded-md border border-panel bg-surface px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-panel"
        >
          Back to Quote Comparison
        </Link>
      </div>
    </div>
  )
}


