"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type SupplierReview = {
  id: number
  supplier_id: string | null
  rfq_id: number | null
  quote_id: number | null
  rating: number | null
  delivery_score: number | null
  price_score: number | null
  compliance_score: number | null
  communication_score: number | null
  quality_score: number | null
  review_notes: string | null
  created_at: string | null
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

function scoreText(score: number | null): string {
  return score == null ? "-" : `${score}/5`
}

function SupplierReviewsSkeleton() {
  return (
    <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="h-4 w-64 animate-pulse rounded bg-panel" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-panel" />
        ))}
      </div>
    </div>
  )
}

export default function AdminSupplierReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<SupplierReview[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadSupplierReviews() {
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

      const { data, error } = await supabase
        .from("supplier_reviews")
        .select("id, supplier_id, rfq_id, quote_id, rating, delivery_score, price_score, compliance_score, communication_score, quality_score, review_notes, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      setReviews((data ?? []) as SupplierReview[])
      setLoading(false)
    }

    loadSupplierReviews()
  }, [router])

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Admin / Supplier Performance
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            Supplier Reviews
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Review supplier performance ratings across awarded RFQs, including
            delivery, pricing, compliance, communication, and quality signals.
          </p>
        </div>
        <Link
          href="/dashboard/admin/supplier-reviews/new"
          className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
        >
          New Supplier Review
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Supplier reviews failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && <SupplierReviewsSkeleton />}

      {!loading && !errorMessage && reviews.length === 0 && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No supplier reviews have been captured yet.
          </p>
          <p className="mt-2 text-xs text-muted">
            Use New Supplier Review after an RFQ has been awarded and delivered.
          </p>
        </div>
      )}

      {!loading && !errorMessage && reviews.length > 0 && (
        <section className="overflow-hidden rounded-md border border-panel bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead>
                <tr className="border-b border-panel bg-panel">
                  {[
                    "Supplier ID",
                    "RFQ ID",
                    "Quote ID",
                    "Rating",
                    "Scores",
                    "Review Notes",
                    "Created",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-panel">
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className="align-top transition-colors hover:bg-surface"
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-secondary">
                        {review.supplier_id || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-secondary">
                        {review.rfq_id ? `RFQ-${review.rfq_id}` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-secondary">
                        {review.quote_id ? `Q-${review.quote_id}` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-md border border-accent-soft bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">
                        {scoreText(review.rating)}
                      </span>
                    </td>
                    <td className="max-w-[340px] px-4 py-4 text-secondary">
                      <p className="leading-6">
                        Delivery {scoreText(review.delivery_score)} | Price{" "}
                        {scoreText(review.price_score)} | Compliance{" "}
                        {scoreText(review.compliance_score)} | Communication{" "}
                        {scoreText(review.communication_score)} | Quality{" "}
                        {scoreText(review.quality_score)}
                      </p>
                    </td>
                    <td className="max-w-[360px] px-4 py-4 text-secondary">
                      <p className="line-clamp-4 leading-6">
                        {review.review_notes || "-"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-secondary">
                      {formatDateTime(review.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-panel px-5 py-3">
            <p className="text-xs text-muted">
              Showing {reviews.length} supplier review
              {reviews.length !== 1 ? "s" : ""}.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
