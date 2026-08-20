'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Match {
  tenderId: number;
  tenderTitle: string;
  buyer: string;
  closingDate: string;
  matchScore: number;
  matchReasons: string[];
  reason: 'perfect_match' | 'qualified' | 'partial_match' | 'no_match';
}

interface MatchSummary {
  total_matches: number;
  perfect_matches: number;
  qualified_matches: number;
  partial_matches: number;
}

const reasonColors = {
  perfect_match: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
  qualified: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
  partial_match: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100' },
  no_match: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', badge: 'bg-gray-100' },
};

const reasonLabels = {
  perfect_match: '🎯 Perfect Match',
  qualified: '✓ Qualified',
  partial_match: '◐ Partial Match',
  no_match: '✗ No Match',
};

export default function SupplierMatchesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'perfect_match' | 'qualified' | 'partial_match'>('all');

  useEffect(() => {
    const loadMatches = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        try {
          const response = await fetch(`/api/analytics/supplier-matches?supplier_id=${data.user.id}&min_score=40&limit=50`);
          const result = await response.json();

          if (result.matches) {
            setMatches(result.matches);
            setSummary(result.summary);
          }
        } catch (error) {
          console.error('Failed to load matches:', error);
        }
      }

      setLoading(false);
    };

    loadMatches();
  }, []);

  const filteredMatches = filter === 'all' ? matches : matches.filter((m) => m.reason === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-gray-500 text-center">Loading your opportunities...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 mb-4">You need to be logged in to view matches.</p>
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Opportunity Matches</h1>
          <p className="text-gray-600">Tenders your company qualifies for, ranked by match quality.</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-semibold">Perfect Matches</p>
              <p className="text-2xl font-bold text-green-600">{summary.perfect_matches}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-blue-500">
              <p className="text-gray-500 text-sm font-semibold">Qualified</p>
              <p className="text-2xl font-bold text-blue-600">{summary.qualified_matches}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-yellow-500">
              <p className="text-gray-500 text-sm font-semibold">Partial Matches</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.partial_matches}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow border-l-4 border-gray-400">
              <p className="text-gray-500 text-sm font-semibold">Total</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_matches}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['all', 'perfect_match', 'qualified', 'partial_match'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All Matches' : reasonLabels[f]}
            </button>
          ))}
        </div>

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-600">No matches found in this category. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => {
              const colors = reasonColors[match.reason];
              const closingDate = new Date(match.closingDate);
              const daysUntil = Math.ceil((closingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

              return (
                <div key={match.tenderId} className={`${colors.bg} border ${colors.border} rounded-lg p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`${colors.badge} ${colors.text} px-3 py-1 rounded-full text-sm font-semibold`}>
                          {reasonLabels[match.reason]}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{match.matchScore}% match</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{match.tenderTitle}</h3>
                      <p className="text-sm text-gray-600 mb-3">{match.buyer}</p>

                      {/* Match Reasons */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {match.matchReasons.map((reason, idx) => (
                          <span key={idx} className="inline-block bg-white bg-opacity-60 text-xs text-gray-700 px-2 py-1 rounded">
                            {reason}
                          </span>
                        ))}
                      </div>

                      {/* Deadline */}
                      <p className={`text-xs font-semibold ${daysUntil <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                        Closes {closingDate.toLocaleDateString()} ({daysUntil > 0 ? `${daysUntil} days left` : 'Closed'})
                      </p>
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/tenders/${match.tenderId}`}
                      className="ml-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg whitespace-nowrap"
                    >
                      View Tender →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-blue-900">
            <strong>How matching works:</strong> We analyze your company profile (industry, location, certifications, B-BBEE level) and match
            you with tenders you&apos;re qualified for. Scores reflect industry match, geographic fit, compliance readiness, and credibility.
            Perfect matches meet all key requirements. Qualified matches meet most. Partial matches show potential.
          </p>
        </div>
      </div>
    </div>
  );
}
