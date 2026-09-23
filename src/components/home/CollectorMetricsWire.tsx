'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  lastRunDate: string | null
  regionalCount: number
  liveCount: number
  loading: boolean
}

export default function CollectorMetricsWire({
  regionalCount = 217,
  liveCount = 239,
  compact = false
}: {
  regionalCount?: number
  liveCount?: number
  compact?: boolean
}) {
  const [wireState, setWireState] = useState<WireState>({
    lastRunTime: null,
    lastRunDate: null,
    regionalCount,
    liveCount,
    loading: true,
  })

  useEffect(() => {
    async function fetchLastRun() {
      try {
        const response = await fetch('/api/collector-metrics?limit=1&order=run_date.desc', { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to fetch collector metrics')

        const data = (await response.json()) as CollectorMetric[]
        if (data.length > 0) {
          const lastRun = new Date(data[0].run_date)
          const timeStr = lastRun.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
          const dateStr = lastRun.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })
          setWireState(prev => ({
            ...prev,
            lastRunTime: timeStr,
            lastRunDate: dateStr,
            loading: false,
          }))
        } else {
          setWireState(prev => ({
            ...prev,
            lastRunDate: 'Never run',
            loading: false,
          }))
        }
      } catch (error) {
        console.error('Error fetching collector metrics:', error)
        setWireState(prev => ({
          ...prev,
          lastRunDate: 'Unable to load',
          loading: false,
        }))
      }
    }

    fetchLastRun()
  }, [])

  if (compact) {
    // Compact card format for grid
    return (
      <Link href="/dashboard/admin/collector-metrics" className="block h-full">
        <div className="rounded-xl border border-panel bg-card p-5 shadow-panel h-full hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm uppercase tracking-widest text-secondary font-semibold">Collector Status</p>
              </div>
              <div className="mt-4">
                <p className="text-xs text-secondary/75">Last run</p>
                <p className="text-lg font-bold text-heading mt-1">
                  {wireState.loading ? '...' : `${wireState.lastRunDate}, ${wireState.lastRunTime}`}
                </p>
              </div>
              <div className="mt-4 flex gap-4 text-sm">
                <div>
                  <p className="text-xs text-secondary/75">Live</p>
                  <p className="font-bold text-heading">{wireState.liveCount}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary/75">Regional</p>
                  <p className="font-bold text-heading">{wireState.regionalCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Original full-width format (if needed)
  return (
    <Link href="/dashboard/admin/collector-metrics" className="block">
      <button
        type="button"
        className="w-full rounded-md bg-[#1a3a2a] px-4 py-3 text-white hover:bg-[#1a3a2a]/90 transition-colors flex items-center justify-center gap-2"
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
          {wireState.loading ? 'Loading...' : `Last run: ${wireState.lastRunDate}, ${wireState.lastRunTime}`}
        </span>
      </button>
    </Link>
  )
}
