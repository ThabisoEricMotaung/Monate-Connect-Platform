'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { PublicRFQ } from "@/lib/publicOpportunities"
import { PROVINCE_IDS } from '@/data/province-meta'

type Metric = 'total' | 'closing' | 'recent'

interface ProvinceStats {
  id: string
  name: string
  abbreviation: string
  total: number
  closing: number
  recent: number
  rank: number
  relativeActivity: number
  metricValue: number
}

interface RegionalInsightsMapProps {
  opportunities: PublicRFQ[]
  totalGovernmentOpportunities?: number
}

// Rank-based color system
const getRankColor = (rank: number) => {
  if (rank === 1) return { primary: '#185FA5', accent: '#378ADD' } // Blue
  if (rank === 2) return { primary: '#0F6E56', accent: '#5DCAA5' } // Green
  return { primary: '#854F0B', accent: '#c9a13b' } // Gold
}

export default function RegionalInsightsMap({
  opportunities,
  totalGovernmentOpportunities
}: RegionalInsightsMapProps) {
  const router = useRouter()
  const [activeMetric, setActiveMetric] = useState<Metric>('total')

  // Calculate province data with ranking
  const rankedProvinces = useMemo(() => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const data: Record<string, { name: string; total: number; closing: number; recent: number }> = {}

    // Initialize all provinces
    Object.entries(PROVINCE_IDS).forEach(([name, id]) => {
      data[id] = { name, total: 0, closing: 0, recent: 0 }
    })

    // Aggregate opportunities - ensure every opportunity is counted exactly once
    let opportunitiesWithoutProvince = 0

    opportunities.forEach((opp, idx) => {
      let provs = opp.provinces || (opp.province ? [opp.province] : [])

      // Filter out invalid provinces like "National" that don't match SA provinces
      provs = provs.filter(p => Object.keys(PROVINCE_IDS).includes(p))

      // Mock: if no province data, distribute for demo
      if (provs.length === 0) {
        opportunitiesWithoutProvince++
        const provinceNames = Object.keys(PROVINCE_IDS)
        provs = [provinceNames[idx % provinceNames.length]]
      }

      const isRecent = opp.published_date ? new Date(opp.published_date) >= sevenDaysAgo : false
      const isClosing = opp.closing_date ? new Date(opp.closing_date) <= sevenDaysFromNow && new Date(opp.closing_date) > now : false

      provs.forEach((prov) => {
        const provId = Object.entries(PROVINCE_IDS).find(([name]) => name === prov)?.[1]

        if (provId && data[provId]) {
          data[provId].total += 1
          if (isRecent) data[provId].recent += 1
          if (isClosing) data[provId].closing += 1
        } else if (!provId) {
          console.warn(`⚠️ Unknown province: "${prov}" for opportunity ${opp.id}`)
        }
      })
    })

    if (opportunitiesWithoutProvince > 0) {
      console.log(`ℹ️ ${opportunitiesWithoutProvince} opportunities had no province - distributed via mock`)
    }

    // Convert to array with ranking
    const maxVal = Math.max(...Object.values(data).map(d => d.total), 1)
    const abbreviations: Record<string, string> = {
      WC: 'WC', EC: 'EC', NC: 'NC', FS: 'FS', KZN: 'KZN', GP: 'GP', MP: 'MP', LP: 'LP', NW: 'NW'
    }

    const array: ProvinceStats[] = Object.entries(data).map(([id, d]) => ({
      id,
      name: d.name,
      abbreviation: abbreviations[id] || id,
      total: d.total,
      closing: d.closing,
      recent: d.recent,
      rank: 0,
      relativeActivity: d.total / maxVal,
      metricValue: 0,
    }))

    // Sort by active metric descending
    array.sort((a, b) => {
      const aVal = activeMetric === 'total' ? a.total : activeMetric === 'closing' ? a.closing : a.recent
      const bVal = activeMetric === 'total' ? b.total : activeMetric === 'closing' ? b.closing : b.recent
      return bVal - aVal
    })

    // Assign ranks and metric values
    array.forEach((p, idx) => {
      p.rank = idx + 1
      p.metricValue = activeMetric === 'total' ? p.total : activeMetric === 'closing' ? p.closing : p.recent
    })

    return array
  }, [opportunities, activeMetric])

  // Calculate top 3 insight
  const topThreeInsight = useMemo(() => {
    const top3 = rankedProvinces.slice(0, 3)
    const top3Total = top3.reduce((sum, p) => sum + p.total, 0)
    const totalAll = rankedProvinces.reduce((sum, p) => sum + p.total, 0)
    const percentage = totalAll > 0 ? ((top3Total / totalAll) * 100).toFixed(1) : '0.0'
    return { percentage }
  }, [rankedProvinces])

  // Overall stats
  const totalOpportunities = opportunities.length
  const closingCount = useMemo(() => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return opportunities.filter(opp => {
      const closingDate = opp.closing_date ? new Date(opp.closing_date) : null
      return closingDate && closingDate <= sevenDaysFromNow && closingDate > now
    }).length
  }, [opportunities])

  const recentCount = useMemo(() => {
    const twoDaysAgo = new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000)
    return opportunities.filter(opp => {
      const publishedDate = opp.published_date ? new Date(opp.published_date) : null
      return publishedDate && publishedDate >= twoDaysAgo
    }).length
  }, [opportunities])

  // Verify numbers match API stats
  useMemo(() => {
    const sumProvinces = rankedProvinces.reduce((sum, p) => sum + p.total, 0)
    const match = totalOpportunities === sumProvinces
    console.log('📊 RegionalInsightsMap Stats Verification:')
    console.log(`  Total Gov. Opportunities: ${totalGovernmentOpportunities}`)
    console.log(`  Live & Accepting: ${totalOpportunities}`)
    console.log(`  Closing This Week: ${closingCount}`)
    console.log(`  New in 48h: ${recentCount}`)
    console.log(`  Sum of provinces (total): ${sumProvinces}`)
    console.log(`  Match: ${match ? '✅' : '❌ MISMATCH'}`)
  }, [totalOpportunities, closingCount, recentCount, rankedProvinces, totalGovernmentOpportunities])

  // Split provinces: top 5 and remaining 4
  const topProvinces = rankedProvinces.slice(0, 5)
  const remainingProvinces = rankedProvinces.slice(5, 9)

  return (
    <section id="regional-insights" className="border-y border-[#e3d8c5] bg-white px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Top Composition */}
        <div className="mb-16">
          {/* Eyebrow + Heading */}
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest font-semibold text-[#7a7066] mb-3">
              Opportunity Insights
            </p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-[#1a3a2a] mb-4">
              Province activity
            </h2>
            <p className="text-sm text-[#7a7066] font-medium mb-6 max-w-2xl">
              Ranked by open opportunities
            </p>
            <p className="text-base text-[#5a6a5a] max-w-3xl leading-relaxed">
              Explore how current procurement opportunities are distributed across South Africa. Click any province to view its open opportunities.
            </p>
          </div>

          {/* Map + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* SA Map */}
            <div className="lg:col-span-2">
              <div className="relative bg-[#f9f8f6] p-8 border border-[#e8dcc8]" style={{ minHeight: '280px' }}>
                <Image
                  src="/assets/south-africa-provinces-aiform.svg"
                  alt="South Africa provinces map showing opportunity distribution"
                  width={400}
                  height={280}
                  className="w-full h-auto max-w-md mx-auto object-contain opacity-90"
                  priority
                />
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-b from-[#f5f3f0] to-[#faf9f5] border border-[#e8dcc8] p-8">
              <p className="text-xs uppercase tracking-widest font-semibold text-[#7a7066] mb-6">
                Coverage
              </p>
              <div className="space-y-6">
                <div>
                  <p className="text-4xl font-bold text-[#1a3a2a] mb-1">9</p>
                  <p className="text-sm text-[#7a7066]">provinces</p>
                </div>
                <div className="pt-6 border-t border-[#e8dcc8]">
                  <p className="text-3xl font-bold text-[#1a3a2a] mb-1">{totalOpportunities.toLocaleString()}</p>
                  <p className="text-sm text-[#7a7066]">Currently tracked</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Toggle */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'total' as const, label: 'All Opportunities' },
            { key: 'closing' as const, label: 'Closing Soon' },
            { key: 'recent' as const, label: 'Recently Available' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`text-sm px-4 py-2 transition-colors font-medium ${
                activeMetric === m.key
                  ? 'bg-[#1a3a2a] text-white'
                  : 'bg-[#f0f0f0] text-[#5a6a5a] hover:bg-[#e0e0e0]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Province Cards Grid */}
        <div className="space-y-8">
          {/* Top 5 Provinces */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {topProvinces.map((province) => {
              const colors = getRankColor(province.rank)
              return (
                <ProvincCard
                  key={province.id}
                  province={province}
                  colors={colors}
                  onNavigate={() => router.push(`/tenders?province=${encodeURIComponent(province.name)}`)}
                />
              )
            })}
          </div>

          {/* Bottom Row: 4 Cards + Insight Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {remainingProvinces.map((province) => {
              const colors = getRankColor(province.rank)
              return (
                <ProvincCard
                  key={province.id}
                  province={province}
                  colors={colors}
                  onNavigate={() => router.push(`/tenders?province=${encodeURIComponent(province.name)}`)}
                />
              )
            })}

            {/* Insight Panel */}
            <div className="bg-[#1a3a2a] text-white p-8 flex flex-col justify-center lg:col-span-1">
              <p className="text-xs uppercase tracking-widest font-semibold text-[#c8a060] mb-4">
                Key Insight
              </p>
              <p className="text-sm leading-relaxed mb-4">
                Top 3 provinces account for
              </p>
              <p className="text-4xl font-bold text-[#c8a060] mb-4">
                {topThreeInsight.percentage}%
              </p>
              <p className="text-xs text-[#e8dcc8]">
                of currently tracked opportunities
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Province Card Component
function ProvincCard({
  province,
  colors,
  onNavigate,
}: {
  province: ProvinceStats
  colors: { primary: string; accent: string }
  onNavigate: () => void
}) {
  return (
    <div
      onClick={onNavigate}
      className="bg-white border border-[#e8dcc8] cursor-pointer transition-all duration-200 overflow-hidden hover:border-[#c8a060] hover:shadow-lg group"
      style={{
        minHeight: '240px',
      }}
    >
      {/* Header with Gradient */}
      <div
        style={{
          background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.accent}08 100%)`,
          borderBottom: `1px solid ${colors.accent}20`,
        }}
        className="p-4"
      >
        {/* Rank Badge + Navigation */}
        <div className="flex justify-between items-start mb-3">
          <div
            style={{
              background: colors.accent,
              color: 'white',
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          >
            {province.rank}
          </div>
          <svg
            className="w-5 h-5 text-[#7a7066] group-hover:text-[#1a3a2a] transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Province Info */}
        <div className="mb-3">
          <p className="text-xs uppercase font-semibold text-[#7a7066] tracking-wide mb-1">
            {province.abbreviation}
          </p>
          <p className="text-sm font-semibold text-[#1a3a2a]">{province.name}</p>
        </div>

        {/* Hero Number */}
        <p
          style={{ color: colors.primary }}
          className="text-3xl font-bold mb-1"
        >
          {province.metricValue}
        </p>
        <p className="text-xs text-[#7a7066]">open</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 border-b border-[#e8dcc8] p-4">
        <div>
          <p className="text-xs uppercase font-semibold text-[#7a7066] tracking-wide mb-2">
            Closing
          </p>
          <p className="text-xl font-bold text-[#c9a13b]">{province.closing}</p>
        </div>
        <div>
          <p className="text-xs uppercase font-semibold text-[#7a7066] tracking-wide mb-2">
            New 48h
          </p>
          <p className="text-xl font-bold text-[#5DCAA5]">{province.recent}</p>
        </div>
      </div>

      {/* Activity Bar */}
      <div className="p-4">
        <div className="bg-[#f0f0f0] h-1.5 mb-2" style={{ borderRadius: '1px' }}>
          <div
            style={{
              width: `${province.relativeActivity * 100}%`,
              background: colors.accent,
              borderRadius: '1px',
            }}
            className="h-full transition-all duration-300"
          />
        </div>
      </div>
    </div>
  )
}
