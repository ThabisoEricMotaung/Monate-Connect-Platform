"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface ProvinceData {
  name: string
  count: number
  lat: number
  lng: number
}

const PROVINCE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "Eastern Cape": { lat: -32.5, lng: 26.5 },
  "Free State": { lat: -28.5, lng: 25.5 },
  Gauteng: { lat: -25.5, lng: 28.2 },
  "KwaZulu-Natal": { lat: -28.8, lng: 30.5 },
  Limpopo: { lat: -24.0, lng: 28.8 },
  Mpumalanga: { lat: -25.5, lng: 30.5 },
  "Northern Cape": { lat: -28.5, lng: 24.5 },
  "North West": { lat: -25.5, lng: 25.5 },
  "Western Cape": { lat: -33.5, lng: 22.0 },
}

interface OpportunitiesMapProps {
  opportunities: Array<{ province?: string | null; provinces?: string[] | null }>
}

export default function OpportunitiesMap({ opportunities }: OpportunitiesMapProps) {
  const [provinceData, setProvinceData] = useState<ProvinceData[]>([])

  useEffect(() => {
    // Aggregate opportunities by province
    const provinceCounts: Record<string, number> = {}

    opportunities.forEach((opp) => {
      const provs = opp.provinces || (opp.province ? [opp.province] : [])
      provs.forEach((prov) => {
        if (prov) {
          provinceCounts[prov] = (provinceCounts[prov] || 0) + 1
        }
      })
    })

    // Convert to ProvinceData array with coordinates
    const data = Object.entries(provinceCounts)
      .map(([name, count]) => ({
        name,
        count,
        lat: PROVINCE_COORDINATES[name]?.lat || 0,
        lng: PROVINCE_COORDINATES[name]?.lng || 0,
      }))
      .filter((d) => d.lat !== 0 && d.lng !== 0)

    setProvinceData(data)
  }, [opportunities])

  // Calculate SVG viewBox dimensions for SA (roughly -34 to -22 lat, 16 to 33 lng)
  const mapWidth = 800
  const mapHeight = 600
  const minLat = -34.5
  const maxLat = -21.5
  const minLng = 15.5
  const maxLng = 33

  const latToY = (lat: number) => ((maxLat - lat) / (maxLat - minLat)) * mapHeight
  const lngToX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * mapWidth

  // Find max count for sizing
  const maxCount = Math.max(...provinceData.map((d) => d.count), 1)

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        className="w-full max-w-2xl mx-auto"
        style={{ aspectRatio: `${mapWidth}/${mapHeight}` }}
      >
        {/* SA Map background */}
        <g className="opacity-10 fill-[#1a3a2a]">
          {/* Simplified SA outline - just for visual reference */}
          <path
            d="M 50 100 L 150 50 L 200 60 L 250 80 L 300 70 L 350 90 L 400 100 L 420 150 L 430 200 L 420 250 L 400 280 L 350 300 L 300 310 L 250 300 L 200 280 L 150 250 L 100 240 L 60 200 L 50 150 Z"
            className="opacity-20"
          />
        </g>

        {/* Province markers with circles */}
        {provinceData.map((prov) => {
          const x = lngToX(prov.lng)
          const y = latToY(prov.lat)
          const radius = Math.max(8, (prov.count / maxCount) * 25)

          return (
            <g key={prov.name}>
              {/* Outer circle (pulse effect) */}
              <circle
                cx={x}
                cy={y}
                r={radius + 5}
                fill="#c8a060"
                opacity="0.15"
                className="transition-opacity hover:opacity-25"
              />
              {/* Main circle */}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="#c8a060"
                className="transition-all hover:r-[30px] cursor-pointer"
              />
              {/* Count label */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-bold fill-[#1a3a2a] pointer-events-none"
              >
                {prov.count}
              </text>
            </g>
          )
        })}

        {/* Province labels */}
        {provinceData.map((prov) => {
          const x = lngToX(prov.lng)
          const y = latToY(prov.lat) + 40

          return (
            <text
              key={`label-${prov.name}`}
              x={x}
              y={y}
              textAnchor="middle"
              className="text-xs fill-[#1a3a2a]/70 font-semibold pointer-events-none"
            >
              {prov.name}
            </text>
          )
        })}
      </svg>

      {/* Legend and stats */}
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
        <div className="text-center">
          <p className="text-4xl font-bold text-[#1a3a2a]">{opportunities.length}</p>
          <p className="mt-2 text-sm text-[#5a6a5a]">Live opportunities</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-bold text-[#1a3a2a]">{provinceData.length}</p>
          <p className="mt-2 text-sm text-[#5a6a5a]">Provinces active</p>
        </div>
        <div className="text-center col-span-2 sm:col-span-1">
          <p className="text-4xl font-bold text-[#1a3a2a]">500+</p>
          <p className="mt-2 text-sm text-[#5a6a5a]">Total registered</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link
          href="/opportunities"
          className="inline-flex px-6 py-3 bg-[#c8a060] text-[#1a3a2a] font-bold text-sm uppercase tracking-wider rounded-none transition hover:bg-[#dfc06e]"
        >
          Explore opportunities
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex px-6 py-3 border-2 border-[#c8a060] text-[#c8a060] font-bold text-sm uppercase tracking-wider rounded-none transition hover:bg-[#c8a060]/10"
        >
          Register free →
        </Link>
      </div>
    </div>
  )
}
