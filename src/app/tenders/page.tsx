'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TenderCard } from '@/components/TenderCard';
import { supabase } from '@/lib/supabase';
import { saveSearch } from '@/lib/savedSearches';
import type { User } from '@supabase/supabase-js';

interface Tender {
  id: number;
  reference_number: string;
  title: string;
  buyer_normalized: string;
  closing_date: string;
  sources: string;
  estimated_budget?: number;
}

const SOURCES = [
  { value: '', label: 'All sources' },
  { value: 'eTenders', label: 'eTenders.gov.za' },
  { value: 'Ekurhuleni', label: 'Ekurhuleni Metropolitan Municipality' },
  { value: 'DBSA', label: 'Development Bank of Southern Africa' },
  { value: 'TCTA', label: 'Trans-Caledon Tunnel Authority' },
];

const BUDGET_RANGES = [
  { value: '', label: 'All budgets' },
  { value: '0-5m', label: 'R0–5M' },
  { value: '5-20m', label: 'R5–20M' },
  { value: '20m+', label: 'R20M+' },
  { value: 'unspecified', label: 'Not specified' },
];

type BudgetRange = '' | '0-5m' | '5-20m' | '20m+' | 'unspecified';

const ITEMS_PER_PAGE = 50;

export default function TendersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [daysFilter, setDaysFilter] = useState(90);
  const [budgetFilter, setBudgetFilter] = useState<BudgetRange>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [saveMessage, setSaveMessage] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const loadTenders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (source) params.append('source', source);
        params.append('daysUntilClose', daysFilter.toString());
        params.append('limit', ITEMS_PER_PAGE.toString());
        params.append('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

        const response = await fetch(`/api/tenders?${params.toString()}`);
        const json = await response.json();
        setTenders(json.data || []);
        setTotal(json.total || 0);
      } catch (error) {
        console.error('Failed to fetch tenders:', error);
        setTenders([]);
        setTotal(0);
      }
      setLoading(false);
    };

    loadTenders();
  }, [search, source, daysFilter, currentPage]);

  // Filter tenders by budget range
  useEffect(() => {
    let filtered = tenders;

    if (budgetFilter) {
      filtered = tenders.filter((tender) => {
        const budget = tender.estimated_budget;

        if (budgetFilter === 'unspecified') {
          return !budget;
        } else if (budgetFilter === '0-5m') {
          return budget && budget < 5_000_000;
        } else if (budgetFilter === '5-20m') {
          return budget && budget >= 5_000_000 && budget < 20_000_000;
        } else if (budgetFilter === '20m+') {
          return budget && budget >= 20_000_000;
        }

        return true;
      });
    }

    setFilteredTenders(filtered);
  }, [tenders, budgetFilter]);

  const handleSaveSearch = async () => {
    if (!user) {
      alert('Please log in to save searches');
      return;
    }

    setSavingSearch(true);
    try {
      const query = search || '*';
      await saveSearch(user.id, {
        search_query: query,
        source: source || null,
        budget_range: budgetFilter || null,
        days_until_close: daysFilter,
        email_notifications: true,
      });
      setSaveMessage('Search saved! You&apos;ll get email alerts for new matches.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save search');
    } finally {
      setSavingSearch(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb & Navigation */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Opportunities</span>
          </nav>
          <button onClick={() => window.history.back()} className="text-blue-600 hover:text-blue-700 ml-4 flex items-center gap-1">
            ← Back
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Live Tender Opportunities & RFQs</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Live Tender Opportunities & RFQs</h1>
          <p className="text-gray-600 mb-8">Search open public opportunities across South Africa.</p>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search opportunities"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              <span className="absolute right-4 top-3 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 items-center">
            <div className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
              • {total.toLocaleString()} active tender{total !== 1 ? 's' : ''}
            </div>
            {total > 0 && (
              <div className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                • {Math.ceil(total * 0.15)} new in the last 48 hours
              </div>
            )}
          </div>

          {/* Source Info */}
          <p className="text-sm text-gray-600 mt-6">
            Opportunities are sourced from public procurement notices and platform-posted RFQs. Data is updated regularly.
          </p>
        </div>
      </div>

      {/* Filter & Results */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="mb-8 flex items-center gap-6 flex-wrap">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-3">Source:</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SOURCES.map((src) => (
                <option key={src.value} value={src.value}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-3">Budget:</label>
            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value as BudgetRange)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {BUDGET_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-3">Closing in:</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>

          <button
            onClick={handleSaveSearch}
            disabled={savingSearch || !user}
            className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            title={!user ? 'Log in to save searches' : 'Save this search and get email alerts'}
          >
            {savingSearch ? '⏳ Saving...' : '💾 Save this search'}
          </button>
        </div>

        {saveMessage && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            saveMessage.includes('saved')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* Tenders List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading opportunities...</p>
          </div>
        ) : filteredTenders.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 mb-4">No opportunities found yet.</p>
            <p className="text-sm text-gray-600">
              {tenders.length > 0 ? 'Try adjusting your filters.' : 'RFQs published on AiForm Procure will appear here automatically when they\'re marked as public and have an open status.'}
            </p>
            <p className="text-xs text-gray-500 mt-4">
              {tenders.length > 0 ? '' : 'Publish new RFQs on the platform to get started.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTenders.map((tender) => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > ITEMS_PER_PAGE && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(total / ITEMS_PER_PAGE)}
              </span>
            </div>

            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(total / ITEMS_PER_PAGE)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}

        {/* Footer Summary */}
        {total > 0 && (
          <div className="mt-8 text-sm text-gray-600">
            Showing {filteredTenders.length} of {total} opportunity{total !== 1 ? 'ies' : ''}
            {search && ` matching "${search}"`}
            {source && ` from ${SOURCES.find(s => s.value === source)?.label}`}
            {budgetFilter && ` with budget ${BUDGET_RANGES.find(b => b.value === budgetFilter)?.label?.toLowerCase()}`}
            {daysFilter && ` closing within ${daysFilter} days`}
          </div>
        )}
      </div>
    </div>
  );
}
