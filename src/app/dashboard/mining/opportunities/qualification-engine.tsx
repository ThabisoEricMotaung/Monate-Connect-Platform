"use client"

import {
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconX,
} from "@tabler/icons-react"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type {
  Json,
  MiningEligibilityGap,
  MiningEligibilityResultWithOpportunity,
  MiningEligibilityRules,
  MiningQualificationStatus,
} from "@/types/mining"

type Filter = "all" | MiningQualificationStatus

const tones = {
  qualified: { border: "border-l-[#3d7a54]", text: "text-[#3d7a54]", label: "Strong matches" },
  potentially_qualified: { border: "border-l-[#c08a2e]", text: "text-[#9a6b1f]", label: "Potentially eligible" },
  not_qualified: { border: "border-l-[#b3583f]", text: "text-[#a14c36]", label: "Not qualified" },
} as const

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return `Closes ${date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`
}

function displayValue(value: Json): string {
  if (Array.isArray(value)) return value.map(String).join(" or ")
  if (value === true) return "Required"
  if (value === false) return "No"
  if (value == null) return "Not on file"
  return String(value)
}

function ruleRows(rules: MiningEligibilityRules, gaps: MiningEligibilityGap[]) {
  const rows: { key: string; label: string; gap?: MiningEligibilityGap }[] = []
  const gapFor = (key: string) => gaps.find((gap) => gap.requirement === key)

  if (rules.province?.length) rows.push({ key: "province", label: `Based in ${rules.province.join(" or ")}`, gap: gapFor("province") })
  if (rules.requires_host_community) rows.push({ key: "requires_host_community", label: "Verified host-community supplier status", gap: gapFor("requires_host_community") })
  if (rules.min_black_ownership_pct != null) rows.push({ key: "min_black_ownership_pct", label: `${rules.min_black_ownership_pct}%+ black ownership`, gap: gapFor("min_black_ownership_pct") })
  if (rules.min_bbee_level != null) rows.push({ key: "min_bbee_level", label: `B-BBEE Level ${rules.min_bbee_level} or better`, gap: gapFor("min_bbee_level") })
  for (const item of rules.required_documents ?? []) {
    const key = `required_documents:${item}`
    rows.push({ key, label: item, gap: gapFor(key) })
  }
  if (rules.min_cidb_grade) rows.push({ key: "min_cidb_grade", label: `CIDB Grade ${rules.min_cidb_grade} or higher`, gap: gapFor("min_cidb_grade") })
  for (const item of rules.required_certifications ?? []) {
    const key = `required_certifications:${item}`
    rows.push({ key, label: item, gap: gapFor(key) })
  }
  if (rules.min_mining_references != null) rows.push({ key: "min_mining_references", label: `${rules.min_mining_references}+ mining project references`, gap: gapFor("min_mining_references") })

  for (const gap of gaps.filter((candidate) => candidate.severity === "soft")) {
    rows.push({ key: gap.requirement, label: gap.requirement.replace("document_expiry:", ""), gap })
  }
  return rows
}

function actionLine(result: MiningEligibilityResultWithOpportunity): string {
  const hardGaps = result.gaps.filter((gap) => gap.severity === "hard").length
  const softGaps = result.gaps.filter((gap) => gap.severity === "soft").length
  if (result.qualification_status === "qualified") {
    return softGaps
      ? `Likely eligible. Resolve the ${softGaps} expiring document ${softGaps === 1 ? "warning" : "warnings"} before submission.`
      : "Likely eligible. Your verified mining passport meets every recorded requirement."
  }
  if (result.qualification_status === "potentially_qualified") {
    return `Potentially eligible. ${hardGaps} ${hardGaps === 1 ? "gap stands" : "gaps stand"} between you and a strong match—review the items above before applying.`
  }
  return `Not currently qualified. ${hardGaps} structural ${hardGaps === 1 ? "gap needs" : "gaps need"} attention; plan for a future round if they cannot be resolved before closing.`
}

export default function QualificationEngine() {
  const [results, setResults] = useState<MiningEligibilityResultWithOpportunity[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) {
        setError("Supabase is not configured.")
        setLoading(false)
        return
      }
      const { data, error: queryError } = await supabase
        .from("mining_eligibility_results")
        .select("*, mining_opportunities(*, mine_operations(*))")
        .order("match_percentage", { ascending: false })

      if (cancelled) return
      if (queryError) setError(queryError.message)
      else setResults((data ?? []) as unknown as MiningEligibilityResultWithOpportunity[])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const counts = useMemo(() => ({
    all: results.length,
    qualified: results.filter((result) => result.qualification_status === "qualified").length,
    potentially_qualified: results.filter((result) => result.qualification_status === "potentially_qualified").length,
    not_qualified: results.filter((result) => result.qualification_status === "not_qualified").length,
  }), [results])
  const visible = filter === "all" ? results : results.filter((result) => result.qualification_status === filter)

  const filters: { value: Filter; label: string; dot?: string }[] = [
    { value: "all", label: "All" },
    { value: "qualified", label: "Strong matches", dot: "bg-[#3d7a54]" },
    { value: "potentially_qualified", label: "Potentially eligible", dot: "bg-[#c08a2e]" },
    { value: "not_qualified", label: "Not qualified", dot: "bg-[#b3583f]" },
  ]

  return (
    <section className="mx-auto max-w-5xl text-[#22281f]">
      <h1 className="font-display text-[26px] font-bold text-[#1a3a2a]">Qualification Engine</h1>
      <p className="mb-[22px] mt-1 max-w-2xl text-[13.5px] leading-6 text-[#6b7568]">
        See how your verified mining passport matches each opportunity. Expand a card for the full requirement checklist and next action.
      </p>

      <div className="mb-[18px] flex flex-wrap gap-2" aria-label="Filter opportunities">
        {filters.map((item) => {
          const active = filter === item.value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={active}
              className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8a060] ${active ? "border-[#1a3a2a] bg-[#1a3a2a] text-white" : "border-[#e4ddcc] bg-white text-[#596255] hover:border-[#c8a060]"}`}
            >
              {item.dot && <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${item.dot}`} />}
              {item.label} <span className="ml-0.5 text-[11px] opacity-80">({counts[item.value]})</span>
            </button>
          )
        })}
      </div>

      {loading && <div className="rounded-lg border border-[#e4ddcc] bg-white p-6 text-sm text-[#6b7568]">Loading qualification results…</div>}
      {error && <div role="alert" className="rounded-lg border border-[#b3583f]/40 bg-white p-6 text-sm text-[#9a4633]">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-lg border border-[#e4ddcc] bg-white p-6 text-sm text-[#6b7568]">No opportunities in this group yet.</div>
      )}

      <div>
        {visible.map((result) => {
          const opportunity = result.mining_opportunities
          const operation = opportunity.mine_operations
          const tone = tones[result.qualification_status]
          const isOpen = openId === result.id
          const hardGapCount = result.gaps.filter((gap) => gap.severity === "hard").length
          const flag = result.qualification_status === "qualified"
            ? `Likely eligible${result.gaps.length ? ` — ${result.gaps.length} item to watch` : ""}`
            : result.qualification_status === "potentially_qualified"
              ? `Potentially eligible — ${hardGapCount} ${hardGapCount === 1 ? "gap" : "gaps"}`
              : `Not currently qualified — ${hardGapCount} ${hardGapCount === 1 ? "gap" : "gaps"}`
          const rows = ruleRows(opportunity.eligibility_rules ?? {}, result.gaps)
          const StatusIcon = result.qualification_status === "qualified" ? IconCheck : result.qualification_status === "potentially_qualified" ? IconAlertTriangle : IconX

          return (
            <article key={result.id} className={`mb-3 overflow-hidden rounded-[10px] border border-l-[5px] border-[#e4ddcc] bg-white ${tone.border}`}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : result.id)}
                aria-expanded={isOpen}
                className="flex min-h-11 w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors hover:bg-[#fdfbf7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#c8a060] sm:gap-[18px] sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-0.5 block text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#a9834a]">
                    {operation ? `${operation.mine_group} — ${operation.operation_name}` : "Mining opportunity"}
                  </span>
                  <span className="mb-1.5 block text-base font-bold text-[#1a3a2a]">{opportunity.title}</span>
                  <span className="mb-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-[#6b7568]">
                    {[operation?.province, formatDate(opportunity.closing_date), opportunity.category].filter(Boolean).map((item) => <span key={item}>{item}</span>)}
                  </span>
                  <span className={`flex items-center gap-1.5 text-[12.5px] font-medium ${tone.text}`}>
                    <StatusIcon aria-hidden="true" size={16} stroke={2} /> {flag}
                  </span>
                </span>
                <span className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-24">
                  <span className={`font-display text-[28px] font-bold leading-none ${tone.text}`}>{Math.round(result.match_percentage)}%</span>
                  <span className="text-[10px] uppercase tracking-[0.04em] text-[#6b7568]">Match</span>
                  <IconChevronDown aria-hidden="true" size={15} className={`text-[#6b7568] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-[#e4ddcc] bg-[#f0ebe0] px-5 py-4 sm:px-6 sm:pb-5">
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.03em] text-[#6b7568]">Requirements</p>
                  {rows.length === 0 && <p className="py-1 text-[13px] text-[#6b7568]">No eligibility rules were specified.</p>}
                  {rows.map((row) => {
                    const isWarning = row.gap?.severity === "soft"
                    const RowIcon = !row.gap ? IconCheck : isWarning ? IconAlertTriangle : IconX
                    const color = !row.gap ? "text-[#3d7a54]" : isWarning ? "text-[#a87520]" : "text-[#6b7568]"
                    return (
                      <div key={row.key} className="flex items-start gap-2.5 py-1 text-[13px] leading-5">
                        <RowIcon aria-hidden="true" size={16} stroke={2} className={`mt-0.5 shrink-0 ${color}`} />
                        <span>
                          {row.label}
                          {row.gap && <span className="text-[#6b7568]"> — required: {displayValue(row.gap.required)}; on file: {displayValue(row.gap.actual)}</span>}
                        </span>
                      </div>
                    )
                  })}
                  <div className="mt-3.5 rounded-lg border border-[#e4ddcc] bg-white px-3.5 py-2.5 text-[12.5px] font-medium text-[#22281f]">
                    {actionLine(result)}
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
