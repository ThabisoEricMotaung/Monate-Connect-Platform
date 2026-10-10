'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { LiveOpportunitySnapshot, RegionCounts } from "@/lib/liveOpportunitySnapshot"

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
  /** The shared live snapshot; the banner and /tenders read the same one. */
  snapshot: LiveOpportunitySnapshot | null
}

function metricOf(counts: RegionCounts, metric: Metric): number {
  return metric === 'total' ? counts.live : metric === 'closing' ? counts.closingSoon : counts.newIn48Hours
}

export default function RegionalInsightsMap({ snapshot }: RegionalInsightsMapProps) {
  const router = useRouter()
  const [activeMetric, setActiveMetric] = useState<Metric>('total')
  const [isExpanded, setIsExpanded] = useState(false)

  // Province figures come straight from the snapshot: live listings only, no
  // estimated or redistributed provinces.
  const rankedProvinces = useMemo(() => {
    if (!snapshot) return []
    const maxVal = Math.max(...snapshot.provinces.map((p) => p.live), 1)
    const array: ProvinceStats[] = snapshot.provinces.map((p) => ({
      id: p.id,
      name: p.name,
      abbreviation: p.id,
      total: p.live,
      closing: p.closingSoon,
      recent: p.newIn48Hours,
      rank: 0,
      relativeActivity: p.live / maxVal,
      metricValue: metricOf(p, activeMetric),
    }))
    array.sort((a, b) => b.metricValue - a.metricValue)
    array.forEach((p, idx) => { p.rank = idx + 1 })
    return array
  }, [snapshot, activeMetric])

  const topThreeInsight = useMemo(() => {
    const top3Total = rankedProvinces.slice(0, 3).reduce((sum, p) => sum + p.total, 0)
    const live = snapshot?.live ?? 0
    return { percentage: live > 0 ? ((top3Total / live) * 100).toFixed(1) : '0.0' }
  }, [rankedProvinces, snapshot])

  if (!snapshot) return null

  const otherRegions = [
    { key: 'national', name: 'National', detail: 'Published for the whole country', counts: snapshot.national },
    { key: 'not-specified', name: 'Province not specified', detail: 'The source gives no province', counts: snapshot.notSpecified },
  ]

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
              <h2 className="text-lg font-semibold text-[#1a3a2a]">By province</h2>
              <p className="text-sm text-[#7a7066] mt-1">
                {isExpanded ? 'Live opportunities by province' : 'Click to view province breakdown'}
              </p>
              <p className="text-xs text-[#a89a88] mt-0.5">
                Same live opportunities as the Live Feed banner and the tenders list, counted by the province each one names.
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

          {/* Stats Banner - same snapshot as the Live Feed banner */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Accepting bids now</p>
              <p className="text-2xl font-bold text-[#1a3a2a] mt-1">
                {snapshot.live.toLocaleString()}
              </p>
            </div>
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Closing Soon</p>
              <p className="text-xl font-bold text-[#1a3a2a] mt-1">{snapshot.closingSoon.toLocaleString()}</p>
            </div>
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">New in 48h</p>
              <p className="text-xl font-bold text-[#1a3a2a] mt-1">{snapshot.newIn48Hours.toLocaleString()}</p>
            </div>
            <div className="rounded-none bg-white p-3 border border-[#d4d0c4]">
              <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Tracked by Province</p>
              <p className="text-xl font-bold text-[#1a3a2a] mt-1">9 regions</p>
            </div>
          </div>

          {/* Metric Tabs */}
          <div className="flex gap-2 mb-8">
            {[
              { key: 'total' as const, label: 'All Live' },
              { key: 'closing' as const, label: 'Closing Soon' },
              { key: 'recent' as const, label: 'New in 48h' },
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
              <p className="text-xs text-[#5a6a5a] mt-0.5">Ranked by {activeMetric === 'total' ? 'live opportunities' : activeMetric === 'closing' ? 'closing soon' : 'new in 48h'}</p>
            </div>
            <p className="text-xs text-[#5a6a5a] font-medium">9 provinces</p>
          </div>

          {/* Province Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {rankedProvinces.map((province) => {
              // Blue color palette for all provinces
              const colors = { accent: '#185fa5', label: '#4b7a7a', secondary: '#378add', border: '#185fa5' }

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

          {/* Opportunities not tied to a single province, shown as published */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {otherRegions.map((region) => (
              <div key={region.key} style={{ background: 'white', border: '1px solid #e5e5e7', borderRadius: '0' }}>
                <div style={{ padding: '0.75rem' }}>
                  <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', color: '#4b7a7a', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                    {region.detail}
                  </p>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#1f2937', margin: '0', lineHeight: 1.1 }}>{region.name}</p>
                  <p style={{ fontSize: '18px', fontWeight: 600, color: '#185fa5', margin: '0.35rem 0 0', lineHeight: 1 }}>
                    {metricOf(region.counts, activeMetric)}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
                  <div>
                    <p style={{ fontSize: '8px', color: '#4b7a7a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>Closing</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#378add', margin: '0.25rem 0 0', lineHeight: 1 }}>{region.counts.closingSoon}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '8px', color: '#4b7a7a', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>New</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#378add', margin: '0.25rem 0 0', lineHeight: 1 }}>{region.counts.newIn48Hours}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <span style={{ fontWeight: 600, color: '#1a3a2a' }}>Top 3 provinces</span> account for {topThreeInsight.percentage}% of the {snapshot.live.toLocaleString()} live opportunities.{' '}
            {snapshot.multiRegionListings > 0
              ? `${snapshot.multiRegionListings.toLocaleString()} ${snapshot.multiRegionListings === 1 ? 'opportunity names' : 'opportunities name'} more than one region and ${snapshot.multiRegionListings === 1 ? 'is' : 'are'} counted in each, so the regional figures add up to ${snapshot.regionalTotal.toLocaleString()}.`
              : 'Each live opportunity is counted in exactly one region.'}
          </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
