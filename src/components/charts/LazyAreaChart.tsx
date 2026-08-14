"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface LazyAreaChartProps {
  data: any[]
  dataKey: string
  strokeColor?: string
  fillColor?: string
  xAxisDataKey?: string
}

export default function LazyAreaChart({
  data,
  dataKey,
  strokeColor = "#3b82f6",
  fillColor = "#3b82f6",
  xAxisDataKey = "period",
}: LazyAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <XAxis dataKey={xAxisDataKey} stroke="#94a3b8" style={{ fontSize: 12 }} />
        <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: 6,
            color: "#f1f5f9",
          }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          fill={fillColor}
          isAnimationActive={true}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
