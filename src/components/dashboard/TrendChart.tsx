"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const TICK = "#94a3b8"

interface TrendPoint {
  period: string
  Quotes: number
}

interface TrendChartProps {
  data: TrendPoint[]
  mounted: boolean
}

export default function TrendChart({ data, mounted }: TrendChartProps) {
  if (!mounted) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="quoteGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b6fe8" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#3b6fe8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: TICK }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: TICK }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: 6,
            color: "#f1f5f9",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="Quotes"
          stroke="#3b6fe8"
          strokeWidth={2}
          fill="url(#quoteGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
