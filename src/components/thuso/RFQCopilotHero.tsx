import Link from "next/link"
import { IconArrowRight, IconCalendarDue, IconListDetails, IconMessage2, IconSparkles } from "@tabler/icons-react"

interface RFQCopilotHeroProps {
  activeRfqCount: number
  quotesReceivedTodayCount: number
  dueSoonCount: number
  loading?: boolean
  browseAllHref: string
  viewQuotesHref: string
  createRfqHref: string
}

export default function RFQCopilotHero({
  activeRfqCount,
  quotesReceivedTodayCount,
  dueSoonCount,
  loading = false,
  browseAllHref,
  viewQuotesHref,
  createRfqHref,
}: RFQCopilotHeroProps) {
  const metrics = [
    { label: "Active RFQs", value: activeRfqCount, detail: "Open and accepting quotes", icon: IconListDetails },
    { label: "Quotes received today", value: quotesReceivedTodayCount, detail: "New supplier responses", icon: IconMessage2 },
    { label: "Due soon", value: dueSoonCount, detail: "Closing in the next 7 days", icon: IconCalendarDue },
  ]

  return (
    <section
      className="relative mb-8 overflow-hidden rounded-xl border border-[#1E3A2B] bg-[#1E3A2B] p-5 text-white sm:p-7"
      aria-labelledby="rfq-copilot-title"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-24 right-12 h-48 w-48 rounded-full border border-[#C8A060]/25" aria-hidden="true" />

      <div className="relative min-w-0">
        <div className="flex items-center gap-2 text-[#E5C98F]">
          <IconSparkles className="h-5 w-5 shrink-0" stroke={1.8} aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Thuso RFQ Copilot</p>
        </div>

        <h2 id="rfq-copilot-title" className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Your procurement pulse
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
          Live activity across your RFQs and supplier responses.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-busy={loading}>
          {metrics.map(({ label, value, detail, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-white/15 bg-[#10281D]/80 p-4">
              <div className="flex items-center gap-2 text-[#E5C98F]">
                <Icon className="h-4 w-4 shrink-0" stroke={1.8} aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums" aria-label={loading ? `${label} loading` : `${label}: ${value}`}>
                {loading ? "—" : value}
              </p>
              <p className="mt-1 text-xs text-white/65">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={browseAllHref} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3A2B]">
            <IconListDetails className="h-4 w-4" stroke={1.8} aria-hidden="true" />
            View RFQs
          </Link>
          <Link href={viewQuotesHref} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3A2B]">
            <IconMessage2 className="h-4 w-4" stroke={1.8} aria-hidden="true" />
            Review quotes
          </Link>
          <Link href={createRfqHref} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#1E3A2B] transition-colors duration-200 hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C98F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1E3A2B]">
            Create RFQ
            <IconArrowRight className="h-4 w-4" stroke={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
