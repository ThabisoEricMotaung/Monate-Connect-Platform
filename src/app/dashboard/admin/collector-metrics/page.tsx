"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface CollectorMetric {
  id: number
  source_name: string
  imported: number
  rejected: number
  incomplete: number
  duplicated: number
  stale: number
  status: string
  created_at: string
}

interface Summary {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  totalImported: number
  totalRejected: number
  totalIncomplete: number
  bySource: Record<string, any>
}

export default function CollectorMetricsDashboard() {
  const [data, setData] = useState<CollectorMetric[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/admin/collector-metrics?days=${days}`)
        const result = await res.json()
        setData(result.metrics || [])
        setSummary(result.summary)
      } catch (error) {
        console.error("Failed to fetch metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [days])

  if (loading) {
    return <div className="p-8 text-center">Loading collector metrics...</div>
  }

  const colors = ["#185fa5", "#4CAF50", "#FF9800", "#F44336", "#9C27B0"]

  // Group data by date for trend chart
  const trendData = data.reduce(
    (acc, metric) => {
      const date = new Date(metric.created_at).toLocaleDateString()
      const existing = acc.find((d) => d.date === date)
      if (existing) {
        existing.imported += metric.imported
        existing.rejected += metric.rejected
      } else {
        acc.push({ date, imported: metric.imported, rejected: metric.rejected })
      }
      return acc
    },
    [] as any[]
  )

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Collector Metrics Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor health and performance of data collectors</p>

          {/* Date Filter */}
          <div className="mt-4 flex gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded ${
                  days === d ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-300"
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm font-medium">Total Runs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalRuns}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm font-medium">Successful</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{summary.successfulRuns}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm font-medium">Failed</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary.failedRuns}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-gray-600 text-sm font-medium">Total Imported</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{summary.totalImported.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="imported" stroke="#4CAF50" name="Imported" />
                <Line type="monotone" dataKey="rejected" stroke="#F44336" name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Source Performance */}
          {summary && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By Source</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(summary.bySource).map(([source, stats]) => ({ source, ...stats }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="imported" fill="#4CAF50" name="Imported" />
                  <Bar dataKey="rejected" fill="#F44336" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Detailed Table */}
        <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Runs</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Source</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Imported</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Rejected</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Incomplete</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((metric) => (
                <tr key={metric.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{metric.source_name}</td>
                  <td className="py-3 px-4 text-gray-600">{new Date(metric.created_at).toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-green-600 font-medium">{metric.imported}</td>
                  <td className="text-right py-3 px-4 text-red-600 font-medium">{metric.rejected}</td>
                  <td className="text-right py-3 px-4 text-orange-600 font-medium">{metric.incomplete}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${metric.status === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {metric.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
