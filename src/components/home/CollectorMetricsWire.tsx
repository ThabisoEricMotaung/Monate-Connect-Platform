'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useOpportunityStats } from './OpportunityStatsBanner'

interface CollectorMetric {
  id: string
  run_date: string
  source: string
  inserted: number
  updated: number
  skipped: number
  is_public?: boolean
}

interface WireState {
  lastRunTime: string | null
  regionalCount: number
  loading: boolean
}

export default function CollectorMetricsWire({ regionalCount = 217 }: { regionalCount?: number }) {
  const [wireState, setWireState] = useState<WireState>({
    lastRunTime: null,
    regionalCount,
    loading: true,
  })

  const apiStats = useOpportunityStats()

  useEffect(() => {
    async function fetchLastRun() {
      try {
        const response = await fetch('/api/collector-metrics?limit=1&order=run_date.desc', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to fetch collector metrics')

        const data = (await response.json()) as CollectorMetric[]
        if (data.length > 0) {
          const lastRun = new Date(data[0].run_date)
          setWireState(prev => ({
            ...prev,
            lastRunTime: lastRun.toLocaleString(),
            loading: false,
          }))
        } else {
          setWireState(prev => ({
            ...prev,
            lastRunTime: 'Never',
            loading: false,
          }))
        }
      } catch (error) {
        console.error('Error fetching collector metrics:', error)
        setWireState(prev => ({
          ...prev,
          lastRunTime: 'Unable to load',
          loading: false,
        }))
      }
    }

    fetchLastRun()
  }, [])

  return (
    <Link href="/dashboard/admin/collector-metrics" className="block">
      <button
        type="button"
        className="w-full rounded-none bg-[#1a3a2a] px-4 py-3 text-white hover:bg-[#1a3a2a]/90 transition-colors flex items-center justify-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="font-semibold">Procurement Activity</span>
        <span className="text-xs opacity-75 ml-auto">
          {wireState.loading ? 'Loading...' : `Last run: ${wireState.lastRunTime}`}
        </span>
      </button>

      {/* Stats below the wire */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-none bg-white border border-[#d4d0c4] p-3">
          <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Total Live & Accepting</p>
          <p className="text-xl font-bold text-[#1a3a2a] mt-1">
            {(apiStats?.liveOpportunities ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-none bg-white border border-[#d4d0c4] p-3">
          <p className="text-xs text-[#5a6a5a] uppercase font-semibold tracking-wider">Regional Coverage</p>
          <p className="text-xl font-bold text-[#1a3a2a] mt-1">
            {wireState.regionalCount.toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  )
}
