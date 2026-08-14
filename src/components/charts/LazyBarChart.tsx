"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface LazyBarChartProps {
  data: Record<string, unknown>[]
  dataKey: string
  barColor?: string
  xAxisDataKey?: string
  showLegend?: boolean
}

export default function LazyBarChart({
  data,
  dataKey,
  barColor = "#3b82f6",
  xAxisDataKey = "label",
  showLegend = false,
}: LazyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
        {showLegend && <Legend />}
        <Bar dataKey={dataKey} fill={barColor} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
