'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { BidResponseModal } from '@/components/BidResponseModal';
import { getTenderResponses, type TenderResponse } from '@/lib/tenderResponses';

interface Tender {
  id: number;
  reference_number: string;
  title: string;
  description?: string | null;
  buyer_normalized: string;
  closing_date: string;
  sources: string;
  estimated_budget?: number;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TenderDetailPage({ params }: PageProps) {
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [bidResponse, setBidResponse] = useState<TenderResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Load tender and track view
  useEffect(() => {
    (async () => {
      const { id: pageId } = await params;

      try {
        const response = await fetch(`/api/tenders?limit=1000&offset=0`);
        const json = await response.json();
        const pageIdNum = parseInt(pageId, 10);
        const found = (json.data || []).find((t: Tender) => t.id === pageIdNum);
        setTender(found || null);

        // Track tender view
        if (found) {
          await fetch('/api/analytics/tender-views', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tender_id: pageIdNum,
              session_id: `session_${Math.random().toString(36).slice(2, 9)}`,
            }),
          }).catch(err => console.error('Analytics tracking error:', err));
        }
      } catch (error) {
        console.error('Failed to fetch tender:', error);
      }
      setLoading(false);
    })();
  }, [params]);

  // Load user and their bid response
  useEffect(() => {
    const getUser = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user && tender) {
        const responses = await getTenderResponses(data.user.id);
        const myResponse = responses.find((r) => r.tender_id === tender.id);
        setBidResponse(myResponse || null);
      }
    };
    if (tender) {
      getUser();
    }
  }, [tender]);

  const isAiFormOpportunity = tender?.sources === 'AiForm Platform' || !tender?.sources;

  const getBuyerPortalUrl = (source?: string) => {
    if (!source) return 'https://www.etenders.gov.za';

    const sourceNorm = source.trim().toLowerCase();

    if (sourceNorm.includes('tcta')) return 'https://www.tcta.co.za/tenders/';
    if (sourceNorm.includes('dbsa')) return 'https://www.dbsa.org/procurement';
    if (sourceNorm.includes('ekurhuleni')) return 'https://www.ekurhuleni.gov.za/for-my-business/tenders/open-tenders/';
    if (sourceNorm.includes('etenders') || sourceNorm.includes('treasury')) return 'https://www.etenders.gov.za';

    return 'https://www.etenders.gov.za';
  };

  const closingDate = tender ? new Date(tender.closing_date) : null;
  const daysUntil = closingDate ? Math.ceil((closingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isClosed = closingDate && daysUntil < 0;

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
        <Link
          href="/tenders"
          className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
        >
          ← Back to Opportunities
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading opportunity details...</p>
          </div>
        ) : !tender ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 mb-4">Opportunity not found.</p>
            <Link href="/tenders" className="text-blue-600 hover:text-blue-700 font-semibold">
              Return to Opportunities
            </Link>
          </div>
        ) : (
          <div className="mb-8">
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded mb-4">
              {isAiFormOpportunity ? 'AiForm Posted' : tender.sources}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{tender.title}</h1>

            {/* Context-aware info box */}
            {isAiFormOpportunity ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8">
                <p className="text-sm text-blue-900 mb-3">
                  <strong>Manage your bid on AiForm Procure.</strong> Access full details, upload documents, and track your response in your <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">Dashboard</Link>.
                </p>
                <p className="text-xs text-blue-800">
                  Already submitted? Track status and communication with the buyer in your responses.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-8">
                <p className="text-sm text-amber-900 mb-3">
                  <strong>This is a public sector opportunity</strong> posted by {tender.buyer_normalized}. To respond, you&apos;ll need to follow their formal procurement process.
                </p>
                <p className="text-xs text-amber-800">
                  Contact the buyer directly or visit their procurement portal for submission instructions and bid requirements.
                </p>
              </div>
            )}

            {/* Description Section */}
            {tender.description && (
              <div className="mb-8 pb-8 border-b border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Description</p>
                <p className="text-gray-700 leading-relaxed text-sm">{tender.description}</p>
              </div>
            )}

            {/* Tender Details Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Organization</p>
                <p className="text-lg text-gray-900">{tender.buyer_normalized}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Source</p>
                <p className="text-lg text-gray-900">{tender.sources || 'AiForm Platform'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Closes</p>
                <p className="text-lg text-gray-900">{closingDate ? format(closingDate, 'dd MMM yyyy, HH:mm') : 'TBD'}</p>
                {!isClosed && closingDate && (
                  <p className={`text-xs mt-1 ${daysUntil <= 7 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    {daysUntil} day{daysUntil !== 1 ? 's' : ''} left
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Estimated Budget</p>
                <p className="text-lg text-gray-900">
                  {tender.estimated_budget ? `R${(tender.estimated_budget / 1_000_000).toFixed(2)}M` : 'Not specified'}
                </p>
              </div>
            </div>

            {/* Bid Status */}
            {bidResponse && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Your Bid Status:</strong> {bidResponse.status === 'draft' ? '📝 Draft' : '✓ Submitted'}
                </p>
                {bidResponse.notes && <p className="text-xs text-blue-800 mt-2">{bidResponse.notes}</p>}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <Link
                href="/tenders"
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg"
              >
                Back to Opportunities
              </Link>

              {!isAiFormOpportunity && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  {bidResponse ? '📝 Update Bid' : '💼 Track Your Bid'}
                </button>
              )}

              {isAiFormOpportunity ? (
                <Link
                  href="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href={getBuyerPortalUrl(tender.sources)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
                >
                  Visit Buyer Portal →
                </Link>
              )}
            </div>

            {/* Bid Response Modal */}
            <BidResponseModal
              tenderId={tender.id}
              tenderTitle={tender.title}
              userId={user?.id || null}
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              onSuccess={(response) => setBidResponse(response)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
