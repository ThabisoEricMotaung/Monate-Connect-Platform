"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface LazyPieChartProps {
  data: Record<string, unknown>[]
  dataKey: string
  nameKey?: string
  colors: string[]
}

export default function LazyPieChart({
  data,
  dataKey,
  colors,
}: LazyPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey={dataKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "none",
            borderRadius: 6,
            color: "#f1f5f9",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
