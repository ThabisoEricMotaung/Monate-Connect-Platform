import type { SmartScoreResult } from "@/lib/smartScore"

type SmartScoreCircleProps = {
  score: SmartScoreResult | number
  label?: string
  monthlyTrend?: number
  tips?: string[]
  size?: "sm" | "md" | "lg"
  compact?: boolean
  className?: string
}

const toneStyles = {
  red: {
    stroke: "#dc2626",
    text: "text-rose-700",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  },
  orange: {
    stroke: "#d97706",
    text: "text-warning",
    badge: "border-warning/40 bg-warning-soft text-warning",
  },
  blue: {
    stroke: "#2563eb",
    text: "text-blue-700",
    badge: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  green: {
    stroke: "#16a34a",
    text: "text-success",
    badge: "border-success/40 bg-success-soft text-success",
  },
  gold: {
    stroke: "#b45309",
    text: "text-amber-700",
    badge: "border-amber-500/35 bg-amber-500/10 text-amber-700",
  },
}

const sizeMap = {
  sm: { svg: 104, radius: 42, stroke: 9, value: "text-2xl", outer: "max-w-[220px]" },
  md: { svg: 132, radius: 54, stroke: 10, value: "text-3xl", outer: "max-w-[260px]" },
  lg: { svg: 164, radius: 68, stroke: 12, value: "text-4xl", outer: "max-w-[320px]" },
}

function normalizeScore(score: SmartScoreResult | number): SmartScoreResult {
  if (typeof score !== "number") return score

  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const level =
    clamped <= 39
      ? { label: "Emerging Supplier / High Risk" as const, tone: "red" as const }
      : clamped <= 59
        ? { label: "Developing Supplier" as const, tone: "orange" as const }
        : clamped <= 74
          ? { label: "Reliable Supplier" as const, tone: "blue" as const }
          : clamped <= 84
            ? { label: "Trusted Supplier" as const, tone: "green" as const }
            : { label: "Elite Supplier" as const, tone: "gold" as const }

  return {
    score: clamped,
    label: level.label,
    tone: level.tone,
    monthlyTrend: 0,
    tips: [],
  }
}

export default function SmartScoreCircle({
  score,
  label,
  monthlyTrend,
  tips,
  size = "md",
  compact = false,
  className = "",
}: SmartScoreCircleProps) {
  const result = normalizeScore(score)
  const tone = toneStyles[result.tone]
  const dimensions = sizeMap[size]
  const circumference = 2 * Math.PI * dimensions.radius
  const progress = result.score / 100
  const trend = monthlyTrend ?? result.monthlyTrend
  const visibleTips = tips ?? result.tips

  return (
    <div
      className={[
        "rounded-md border border-panel bg-card p-5 shadow-panel",
        dimensions.outer,
        className,
      ].join(" ")}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="relative grid place-items-center"
          style={{ width: dimensions.svg, height: dimensions.svg }}
          aria-label={`SmartScore ${result.score} out of 100`}
        >
          <svg
            width={dimensions.svg}
            height={dimensions.svg}
            viewBox={`0 0 ${dimensions.svg} ${dimensions.svg}`}
            aria-hidden="true"
          >
            <circle
              cx={dimensions.svg / 2}
              cy={dimensions.svg / 2}
              r={dimensions.radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={dimensions.stroke}
            />
            <circle
              cx={dimensions.svg / 2}
              cy={dimensions.svg / 2}
              r={dimensions.radius}
              fill="none"
              stroke={tone.stroke}
              strokeWidth={dimensions.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              transform={`rotate(-90 ${dimensions.svg / 2} ${dimensions.svg / 2})`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={["font-semibold tabular-nums leading-none", dimensions.value, tone.text].join(" ")}>
              {result.score}
            </span>
            <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted">
              / 100
            </span>
          </div>
        </div>

        <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-secondary">
          {label ?? "SmartScore"}
        </p>
        <span
          className={[
            "mt-2 inline-flex rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em]",
            tone.badge,
          ].join(" ")}
        >
          {result.label}
        </span>
        <p className="mt-2 text-xs font-semibold text-muted">
          Monthly trend:{" "}
          <span className={trend >= 0 ? "text-success" : "text-rose-700"}>
            {trend >= 0 ? "+" : ""}
            {trend}
          </span>
        </p>
      </div>

      {!compact && visibleTips.length > 0 && (
        <div className="mt-5 border-t border-panel pt-4">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-secondary">
            Improvement tips
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-secondary">
            {visibleTips.map((tip) => (
              <li key={tip} className="rounded border border-panel bg-panel px-3 py-2">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
