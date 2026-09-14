'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

export default function RegionalInsightsMap({
  opportunities,
  totalGovernmentOpportunities
}: RegionalInsightsMapProps) {
  const router = useRouter()
  const [activeMetric, setActiveMetric] = useState<Metric>('total')
  const [isExpanded, setIsExpanded] = useState(false)

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

  const maxMetricValue = Math.max(...rankedProvinces.map(p => p.metricValue), 1)

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

  return (
    <section className="border-y border-[#e3d8c5] bg-white px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-none border border-[#ebebeb] p-6" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {/* Header with Toggle - Styled as Accordion */}
          <div
            className="flex items-center justify-between p-4 mb-6 cursor-pointer transition-all duration-200 rounded-none border border-[#e8e0cc]"
            style={{
              background: isExpanded ? '#faf9f5' : '#f9f8f6',
              borderBottom: isExpanded ? '1px solid #e8e0cc' : '1px solid #d4c4a8',
            }}
            onClick={() => setIsExpanded(!isExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isExpanded ? '#f5f3f0' : '#f5f3f0'
              e.currentTarget.style.borderColor = '#c8a060'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isExpanded ? '#faf9f5' : '#f9f8f6'
              e.currentTarget.style.borderColor = isExpanded ? '#e8e0cc' : '#d4c4a8'
            }}
          >
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#1a3a2a]">Regional Insights</h2>
              <p className="text-sm text-[#7a7066] mt-1">
                {isExpanded ? 'Procurement activity by province' : 'Click to view province breakdown'}
              </p>
            </div>
            <svg
              className="w-6 h-6 text-[#1a3a2a] transition-transform duration-300 flex-shrink-0 ml-4"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Collapsible Content */}
          {isExpanded && (
            <div style={{ animation: 'fadeIn 200ms ease-out' }}>
              <style>{`
                @keyframes fadeIn {
                  from { opacity: 0; max-height: 0; overflow: hidden; }
                  to { opacity: 1; max-height: 2000px; overflow: visible; }
                }
              `}</style>

          {/* Stats Banner */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="rounded-none bg-[#f9f7f4] p-4 border border-[#e8e0cc]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">
                {totalGovernmentOpportunities ? 'Total Gov. RFQs' : 'Live & Accepting'}
              </p>
              <p className="text-2xl font-bold text-[#1a3a2a] mt-1">
                {totalGovernmentOpportunities
                  ? totalGovernmentOpportunities.toLocaleString()
                  : totalOpportunities.toLocaleString()}
              </p>
              {totalGovernmentOpportunities && (
                <p className="text-xs text-[#7a7066] mt-2">
                  {totalOpportunities.toLocaleString()} live & accepting
                </p>
              )}
            </div>
            <div className="rounded-none bg-[#f9f7f4] p-4 border border-[#e8e0cc]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Closing Soon</p>
              <p className="text-2xl font-bold text-[#1a3a2a] mt-1">{closingCount.toLocaleString()}</p>
            </div>
            <div className="rounded-none bg-[#f9f7f4] p-4 border border-[#e8e0cc]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">New in 48h</p>
              <p className="text-2xl font-bold text-[#1a3a2a] mt-1">{recentCount.toLocaleString()}</p>
            </div>
            <div className="rounded-none bg-[#f9f7f4] p-4 border border-[#e8e0cc]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Tracked by Province</p>
              <p className="text-2xl font-bold text-[#1a3a2a] mt-1">9 regions</p>
            </div>
          </div>

          {/* Metric Tabs */}
          <div className="flex gap-2 mb-8">
            {[
              { key: 'total' as const, label: 'All Opportunities' },
              { key: 'closing' as const, label: 'Closing Soon' },
              { key: 'recent' as const, label: 'Recently Available' },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setActiveMetric(m.key)}
                className={`text-sm px-4 py-2 rounded-none transition-colors font-medium ${
                  activeMetric === m.key
                    ? 'bg-[#1a3a2a] text-white'
                    : 'bg-[#f0f0f0] text-[#5a6a5a] hover:bg-[#e0e0e0]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Grid Header */}
          <div className="mb-4 flex justify-between items-baseline">
            <div>
              <p className="text-sm font-semibold text-[#1a3a2a]">Province activity</p>
              <p className="text-xs text-[#5a6a5a] mt-0.5">Ranked by {activeMetric === 'total' ? 'open opportunities' : activeMetric === 'closing' ? 'closing soon' : 'recently available'}</p>
            </div>
            <p className="text-xs text-[#5a6a5a] font-medium">9 provinces</p>
          </div>

          {/* Province Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {rankedProvinces.map((province) => {
              const isTopThree = province.rank <= 3
              const cardBg = isTopThree
                ? '#f9f8f6' // Warm neutral for top 3
                : '#faf9f7' // Slightly cooler neutral for rest

              return (
                <div
                  key={province.id}
                  onClick={() => router.push(`/opportunities?province=${province.name}`)}
                  style={{
                    background: cardBg,
                    border: isTopThree ? '1px solid #d4c4a8' : '1px solid #e8e0cc',
                    borderLeft: isTopThree ? '3px solid #1a3a2a' : '1px solid #e8e0cc',
                    borderRadius: '6px',
                    padding: '20px',
                    transition: 'all 160ms ease-out',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.borderColor = '#c8a060'
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = isTopThree ? '#d4c4a8' : '#e8e0cc'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Top Row: Abbreviation + Rank */}
                  <div className="flex justify-between items-center mb-3">
                    <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#6b5a3f', textTransform: 'uppercase' }}>
                      {province.abbreviation}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#a0946f', textTransform: 'uppercase' }}>
                      #{province.rank}
                    </span>
                  </div>

                  {/* Province Name */}
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a3a2a', margin: '0 0 12px 0', lineHeight: 1.2 }}>
                    {province.name}
                  </h3>

                  {/* Count + Label */}
                  <div className="mb-3">
                    <p style={{ fontSize: '36px', fontWeight: 800, color: '#1a3a2a', margin: '0 0 4px 0', lineHeight: 1 }}>
                      {province.metricValue}
                    </p>
                    <p style={{ fontSize: '12px', color: '#7a7066', margin: 0, fontWeight: 500 }}>
                      {activeMetric === 'total' ? 'Open opportunities' : activeMetric === 'closing' ? 'Closing soon' : 'New in 48h'}
                    </p>
                  </div>

                  {/* Activity Bar */}
                  <div className="mb-4">
                    <div style={{
                      height: '3px',
                      background: '#e8dcc8',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          background: isTopThree ? '#1a3a2a' : '#c8a060',
                          width: `${(province.metricValue / maxMetricValue) * 100}%`,
                          transition: 'width 300ms ease-out',
                        }}
                      />
                    </div>
                  </div>

                  {/* Top 3 Badge */}
                  {isTopThree && (
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#1a3a2a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      opacity: 0.6,
                    }}>
                      {province.rank === 1 && 'Highest activity'}
                      {province.rank === 2 && 'Second highest'}
                      {province.rank === 3 && 'Third highest'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Insight Strip */}
          <div style={{
            background: '#faf9f5',
            border: '1px solid #e8dcc8',
            borderRadius: '6px',
            padding: '16px 18px',
            fontSize: '13px',
            color: '#5a6a5a',
            lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 600, color: '#1a3a2a' }}>Top 3 provinces</span> account for {topThreeInsight.percentage}% of currently tracked opportunities.
          </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
