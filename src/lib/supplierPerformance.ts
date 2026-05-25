export type SupplierPerformanceReview = {
  rating?: number | string | null
  delivery_score?: number | string | null
  price_score?: number | string | null
  compliance_score?: number | string | null
  communication_score?: number | string | null
  quality_score?: number | string | null
}

export type SupplierPerformanceSummary = {
  averageScore: number | null
  reviewCount: number
  label: string
}

const SCORE_FIELDS: Array<keyof SupplierPerformanceReview> = [
  "rating",
  "delivery_score",
  "price_score",
  "compliance_score",
  "communication_score",
  "quality_score",
]

function numericScore(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null

  const score = Number(value)

  return Number.isFinite(score) ? score : null
}

function reviewAverage(review: SupplierPerformanceReview): number | null {
  const scores = SCORE_FIELDS.map((field) => numericScore(review[field])).filter(
    (score): score is number => score !== null
  )

  if (scores.length === 0) return null

  return scores.reduce((total, score) => total + score, 0) / scores.length
}

function performanceLabel(averageScore: number | null): string {
  if (averageScore === null) return "Not Rated"
  if (averageScore < 2.5) return "Needs Attention"
  if (averageScore < 3.5) return "Developing"
  if (averageScore < 4.5) return "Reliable"
  return "High Performer"
}

export function calculateSupplierPerformance(
  reviews: SupplierPerformanceReview[]
): SupplierPerformanceSummary {
  const averages = reviews
    .map((review) => reviewAverage(review))
    .filter((score): score is number => score !== null)

  if (averages.length === 0) {
    return {
      averageScore: null,
      reviewCount: 0,
      label: "Not Rated",
    }
  }

  const averageScore =
    averages.reduce((total, score) => total + score, 0) / averages.length

  return {
    averageScore: Math.round(averageScore * 10) / 10,
    reviewCount: averages.length,
    label: performanceLabel(averageScore),
  }
}
