'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TopSearch {
  query: string;
  count: number;
}

interface TopTender {
  id: number;
  title: string;
  buyer: string;
  views: number;
}

interface SourceItem {
  source: string;
  count: number;
}

interface Analytics {
  topSearches: TopSearch[];
  topTenders: TopTender[];
  funnel: {
    totalSearches: number;
    totalBids: number;
    conversionRate: string | number;
  };
  sourceDistribution: SourceItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/summary');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-gray-500 text-center">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-gray-500 text-center">No analytics data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/dashboard/saved-searches" className="text-blue-600 hover:text-blue-700 font-semibold text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tender Analytics</h1>
          <p className="text-gray-600">Understand user search patterns and engagement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-500 text-sm font-semibold mb-2">Total Saved Searches</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.funnel.totalSearches}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-500 text-sm font-semibold mb-2">Active Bid Responses</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.funnel.totalBids}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-gray-500 text-sm font-semibold mb-2">Bid Conversion Rate</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.funnel.conversionRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Search Keywords</h2>
            {analytics.topSearches.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topSearches}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="query" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No search data yet</p>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Source Distribution</h2>
            {analytics.sourceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.sourceDistribution}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {analytics.sourceDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No source data yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Viewed Tenders</h2>
          {analytics.topTenders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tender</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Organization</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topTenders.map((tender, idx) => (
                    <tr key={tender.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-3 px-4 text-gray-900">
                        <Link href={`/tenders/${tender.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          {tender.title.length > 60 ? tender.title.slice(0, 60) + '...' : tender.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{tender.buyer}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{tender.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No view data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
