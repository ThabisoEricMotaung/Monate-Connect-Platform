'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface TenderDetail {
  id: string;
  reference_number: string;
  title: string;
  buyer_normalized: string;
  closing_date: string;
  created_at: string;
  sources: string;
}

export default function TenderDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setLoading(false);
  }, [params.id]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-6 py-4 border-b border-gray-200">
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-gray-900">Home</Link>
          <span>/</span>
          <Link href="/tenders" className="hover:text-gray-900">Opportunities</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Details</span>
        </nav>
        <button
          onClick={() => window.history.back()}
          className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading opportunity details...</p>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded mb-4">
                ID: {params.id}
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Opportunity Details</h1>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-blue-900">
                  <strong>This opportunity is in your database.</strong> Full details, bidder information, and response management are available in your <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">Dashboard</Link>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Opportunity ID</p>
                  <p className="text-lg text-gray-900">{params.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Source</p>
                  <p className="text-lg text-gray-900">AiForm Procure</p>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 flex gap-4">
                <Link
                  href="/tenders"
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  Back to Opportunities
                </Link>
                <Link
                  href="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  View in Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
