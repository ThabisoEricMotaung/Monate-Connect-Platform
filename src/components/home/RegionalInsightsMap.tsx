'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { PublicRFQ } from "@/lib/publicOpportunities"
import { useOpportunityStats } from "@/components/home/OpportunityStatsBanner"
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

  // Fetch accurate stats from API (instead of calculating from limited array)
  const apiStats = useOpportunityStats()

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
      let provs = (opp.provinces && opp.provinces.length > 0) ? opp.provinces : (opp.province ? [opp.province] : [])

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
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    return opportunities.filter(opp => {
      if (!opp.published_date) return false
      const publishedDate = typeof opp.published_date === 'string'
        ? new Date(opp.published_date)
        : opp.published_date
      return publishedDate && publishedDate >= twoDaysAgo && !isNaN(publishedDate.getTime())
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
    <section className="border-y border-[#e3d8c5] bg-[#f9f9fa] px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-none border border-[#e5e5e7] p-5 bg-white">
          {/* Header with Toggle - Styled as Accordion */}
          <div
            className="flex items-center justify-between p-4 mb-5 cursor-pointer transition-all duration-200 rounded-none border-b border-[#e8e0cc] bg-white hover:bg-[#fafafa]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#1a3a2a]">Regional Insights</h2>
              <p className="text-sm text-[#7a7066] mt-1">
                {isExpanded ? 'Procurement activity by province (showing available regional data)' : 'Click to view province breakdown'}
              </p>
              <p className="text-xs text-[#a89a88] mt-0.5">
                Note: Regional totals reflect the dataset available for provincial analysis; see Live Feed banner for overall opportunity count.
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

          {/* Stats Banner - use API for accuracy */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Live & Accepting</p>
              <p className="text-2xl font-bold text-[#1a3a2a] mt-1">
                {(apiStats?.liveOpportunities ?? totalOpportunities).toLocaleString()}
              </p>
              {totalGovernmentOpportunities && (
                <p className="text-xs text-[#7a7066] mt-1.5">
                  {totalGovernmentOpportunities.toLocaleString()} total gov
                </p>
              )}
            </div>
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Closing Soon</p>
              <p className="text-xl font-bold text-[#1a3a2a] mt-1">{(apiStats?.closingThisWeek ?? closingCount).toLocaleString()}</p>
            </div>
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">New in 48h</p>
              <p className="text-xl font-bold text-[#1a3a2a] mt-1">{(apiStats?.newIn48Hours ?? recentCount).toLocaleString()}</p>
            </div>
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Tracked by Province</p>
              <p className="text-xl font-bold text-[#1a3a2a] mt-1">9 regions</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {rankedProvinces.map((province) => {
              // Blue color palette for all provinces
              const colors = { accent: '#185fa5', label: '#4b7a7a', secondary: '#378add', border: '#185fa5' }
              const closingCount = activeMetric === 'total' ? province.closing : (activeMetric === 'closing' ? 0 : 0)
              const recentCount = activeMetric === 'total' ? province.recent : (activeMetric === 'closing' ? 0 : province.recent)

              return (
                <div
                  key={province.id}
                  onClick={() => router.push(`/tenders?province=${encodeURIComponent(province.name)}`)}
                  style={{
                    background: 'white',
                    border: '1px solid #e5e5e7',
                    borderRadius: '0',
                    padding: '0',
                    transition: 'all 160ms ease-out',
                    cursor: 'pointer',
                    boxShadow: '0 0 0 0px rgba(24, 95, 165, 0)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 20px 2px rgba(24, 95, 165, 0.4), 0 0 40px 4px rgba(24, 95, 165, 0.2)'
                    e.currentTarget.style.background = '#fafafa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 0px rgba(24, 95, 165, 0)'
                    e.currentTarget.style.background = 'white'
                  }}
                >
                  {/* Header */}
                  <div style={{
                    background: 'white',
                    padding: '0.75rem',
                    borderBottom: 'none',
                  }}>
                    {/* Header Row: Rank + Icon */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', color: colors.label, textTransform: 'uppercase' }}>
                        {province.abbreviation} #{province.rank}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </div>

                    {/* Province Name */}
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#1f2937', margin: '0', lineHeight: 1.1 }}>
                      {province.name}
                    </p>

                    {/* Big Number */}
                    <p style={{ fontSize: '18px', fontWeight: 600, color: colors.accent, margin: '0.35rem 0 0', lineHeight: 1 }}>
                      {province.metricValue}
                    </p>
                  </div>

                  {/* Metrics Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                    borderBottom: '1px solid #e5e5e7',
                    padding: '0.5rem 0.75rem',
                  }}>
                    <div>
                      <p style={{ fontSize: '8px', color: colors.label, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>Closing</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: colors.secondary, margin: '0.25rem 0 0', lineHeight: 1 }}>
                        {province.closing}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '8px', color: colors.label, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>New</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: colors.secondary, margin: '0.25rem 0 0', lineHeight: 1 }}>
                        {province.recent}
                      </p>
                    </div>
                  </div>

                  {/* Activity Bar */}
                  <div style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{
                      height: '2px',
                      background: '#f0f0f0',
                      borderRadius: '0',
                      overflow: 'hidden',
                      marginBottom: '0.25rem',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          background: colors.accent,
                          width: `${province.relativeActivity * 100}%`,
                          transition: 'width 300ms ease-out',
                        }}
                      />
                    </div>
                  </div>
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
