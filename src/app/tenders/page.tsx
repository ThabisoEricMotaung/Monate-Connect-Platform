'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TenderCard } from '@/components/TenderCard';
import { supabase } from '@/lib/supabase';
import { saveSearch } from '@/lib/savedSearches';
import { analyticsEvents } from '@/lib/analyticsEvents';
import { useOpportunityStats } from '@/components/home/OpportunityStatsBanner';
import { exportOpportunitiesAsCSV, exportOpportunitiesAsExcel, exportOpportunitiesAsPDF, type ExportableOpportunity } from '@/lib/exportOpportunities';
import type { User } from '@supabase/supabase-js';

interface Tender {
  id: number;
  reference_number: string;
  title: string;
  buyer_normalized: string;
  closing_date: string;
  sources: string;
  estimated_budget?: number;
  status?: string | null;
  province?: string | null;
  category?: string | null;
}

type ExportFormat = 'pdf' | 'csv' | 'excel';

const EXPORT_OPTIONS: Array<{ format: ExportFormat; label: string }> = [
  { format: 'pdf', label: 'Download as PDF' },
  { format: 'csv', label: 'Download as CSV' },
  { format: 'excel', label: 'Download as Excel' },
];

function toExportableOpportunities(tenders: Tender[]): ExportableOpportunity[] {
  return tenders.map((tender) => ({
    title: tender.title,
    buyer: tender.buyer_normalized,
    closingDate: tender.closing_date,
    budget: tender.estimated_budget ?? null,
    status: tender.status ?? null,
    source: tender.sources,
    province: tender.province ?? null,
    category: tender.category ?? null,
  }));
}

const SOURCES = [
  { value: '', label: 'All sources' },
  { value: 'eTenders', label: 'eTenders.gov.za' },
  { value: 'Ekurhuleni', label: 'Ekurhuleni Metropolitan Municipality' },
  { value: 'City of Cape Town', label: 'City of Cape Town Metropolitan Municipality' },
  { value: 'City of Johannesburg', label: 'City of Johannesburg Metropolitan Municipality' },
  { value: 'Department of Health', label: 'National Department of Health' },
  { value: 'DBSA', label: 'Development Bank of Southern Africa' },
  { value: 'TCTA', label: 'Trans-Caledon Tunnel Authority' },
  { value: 'SANRAL', label: 'South African National Roads Agency' },
];

const BUDGET_RANGES = [
  { value: '', label: 'All budgets' },
  { value: '0-5m', label: 'R0–5M' },
  { value: '5-20m', label: 'R5–20M' },
  { value: '20m+', label: 'R20M+' },
  { value: 'unspecified', label: 'Not specified' },
];

type BudgetRange = '' | '0-5m' | '5-20m' | '20m+' | 'unspecified';
type TenderSort = 'recent' | 'closing-soon' | 'closing-later';

const SORT_OPTIONS: Array<{ value: TenderSort; label: string }> = [
  { value: 'recent', label: 'Recently added' },
  { value: 'closing-soon', label: 'Closing soon' },
  { value: 'closing-later', label: 'Closing later' },
];

const ITEMS_PER_PAGE = 50;

function TendersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [source, setSource] = useState(() => searchParams.get('source') || '');
  const [daysFilter, setDaysFilter] = useState(() => Number(searchParams.get('daysUntilClose')) || 0);
  const [budgetFilter, setBudgetFilter] = useState<BudgetRange>(() => (searchParams.get('budget') as BudgetRange) || '');
  const [sort, setSort] = useState<TenderSort>(() => {
    const value = searchParams.get('sort');
    return value === 'closing-soon' || value === 'closing-later' ? value : 'recent';
  });
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));
  const [saveMessage, setSaveMessage] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const opportunityStats = useOpportunityStats({
    source,
    budget: budgetFilter,
    closing: daysFilter,
  });

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      if (!supabase) return;
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
        if (budgetFilter) params.append('budget', budgetFilter);
        if (daysFilter) params.append('daysUntilClose', daysFilter.toString());
        params.append('sort', sort);
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
  }, [search, source, budgetFilter, daysFilter, sort, currentPage]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (source) params.set('source', source);
    if (budgetFilter) params.set('budget', budgetFilter);
    if (daysFilter) params.set('daysUntilClose', daysFilter.toString());
    params.set('sort', sort);
    if (currentPage > 1) params.set('page', currentPage.toString());
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [search, source, budgetFilter, daysFilter, sort, currentPage, pathname, router]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  const handleExport = async (exportFormat: ExportFormat) => {
    setExportMenuOpen(false);
    if (tenders.length === 0 || exportingFormat) return;

    setExportingFormat(exportFormat);
    try {
      const rows = toExportableOpportunities(tenders);
      const stamp = new Date().toISOString().slice(0, 10);
      if (exportFormat === 'csv') {
        exportOpportunitiesAsCSV(rows, `aiform-opportunities-${stamp}.csv`);
      } else if (exportFormat === 'excel') {
        await exportOpportunitiesAsExcel(rows, `aiform-opportunities-${stamp}.xlsx`);
      } else {
        await exportOpportunitiesAsPDF(rows, `aiform-opportunities-${stamp}.pdf`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportingFormat(null);
    }
  };

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
        sort,
        email_notifications: true,
      });
      analyticsEvents.trackSavedSearch(query, source || 'all', 'south africa');
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
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              <span className="absolute right-4 top-3 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Shared public procurement metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total Open RFQs',
                value: opportunityStats?.totalOpenRfqs,
                detail: `${opportunityStats?.liveOpportunities ?? '—'} live and accepting bids`,
              },
              {
                label: 'Closing this week',
                value: opportunityStats?.closingThisWeek,
                detail: 'Closing within the next 7 days',
              },
              {
                label: 'New in 48 hours',
                value: opportunityStats?.newIn48Hours,
                detail: 'Recently posted opportunities',
              },
              {
                label: 'Under evaluation',
                value: opportunityStats?.underEvaluation,
                detail: 'Evaluation in progress',
              },
            ].map((metric) => (
              <article key={metric.label} className="rounded-lg border border-gray-200 border-t-4 border-t-[#1E3A2B] bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1E3A2B]">{metric.label}</p>
                <p className="mt-3 text-3xl font-bold tabular-nums text-gray-900">
                  {metric.value?.toLocaleString() ?? '—'}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-600">{metric.detail}</p>
              </article>
            ))}
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
              onChange={(e) => { setSource(e.target.value); setCurrentPage(1); }}
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
              onChange={(e) => { setBudgetFilter(e.target.value as BudgetRange); setCurrentPage(1); }}
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
              onChange={(e) => { setDaysFilter(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Any future date</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mr-3">Sort by</label>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as TenderSort); setCurrentPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((open) => !open)}
                disabled={tenders.length === 0 || exportingFormat !== null}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
                title="Export the opportunities currently shown"
              >
                {exportingFormat ? '⏳ Exporting...' : '⬇️ Export'}
              </button>
              {exportMenuOpen && (
                <div role="menu" className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    Exports the {tenders.length} opportunit{tenders.length === 1 ? 'y' : 'ies'} shown
                  </p>
                  {EXPORT_OPTIONS.map((option) => (
                    <button
                      key={option.format}
                      type="button"
                      role="menuitem"
                      onClick={() => handleExport(option.format)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSaveSearch}
              disabled={savingSearch || !user}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              title={!user ? 'Log in to save searches' : 'Save this search and get email alerts'}
            >
              {savingSearch ? '⏳ Saving...' : '💾 Save this search'}
            </button>
          </div>
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
        ) : tenders.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 mb-4">No opportunities found yet.</p>
            <p className="text-sm text-gray-600">
              Try adjusting your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tenders.map((tender) => (
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
            Showing {tenders.length} of {total} opportunity{total !== 1 ? 'ies' : ''}
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

export default function TendersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <TendersPageContent />
    </Suspense>
  );
}
