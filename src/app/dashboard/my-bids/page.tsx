'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getTenderResponses, updateTenderResponse, deleteTenderResponse, type TenderResponse } from '@/lib/tenderResponses';
import type { User } from '@supabase/supabase-js';

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  draft: { bg: 'bg-yellow-50', text: 'text-yellow-800', icon: '📝' },
  submitted: { bg: 'bg-blue-50', text: 'text-blue-800', icon: '✓' },
  won: { bg: 'bg-green-50', text: 'text-green-800', icon: '🏆' },
  lost: { bg: 'bg-gray-50', text: 'text-gray-800', icon: '✗' },
};

export default function MyBidsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bids, setBids] = useState<TenderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        const responses = await getTenderResponses(data.user.id);
        setBids(responses);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  const handleStatusChange = async (bidId: number, newStatus: string) => {
    if (!user) return;
    try {
      await updateTenderResponse(user.id, bidId, { status: newStatus as 'draft' | 'submitted' | 'won' | 'lost' });
      setBids(bids.map((b) => (b.id === bidId ? { ...b, status: newStatus as 'draft' | 'submitted' | 'won' | 'lost' } : b)));
    } catch (error) {
      console.error('Error updating bid:', error);
    }
  };

  const handleDelete = async (bidId: number) => {
    if (!user || !confirm('Delete this bid?')) return;
    try {
      await deleteTenderResponse(user.id, bidId);
      setBids(bids.filter((b) => b.id !== bidId));
    } catch (error) {
      console.error('Error deleting bid:', error);
    }
  };

  const filteredBids = filter ? bids.filter((b) => b.status === filter) : bids;
  const statusCounts = {
    draft: bids.filter((b) => b.status === 'draft').length,
    submitted: bids.filter((b) => b.status === 'submitted').length,
    won: bids.filter((b) => b.status === 'won').length,
    lost: bids.filter((b) => b.status === 'lost').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-gray-500 text-center">Loading your bids...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 mb-4">You need to be logged in to view your bids.</p>
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bids</h1>
          <p className="text-gray-600">Track all your tender responses and bid status.</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({bids.length})
          </button>
          {(Object.keys(STATUS_COLORS) as Array<keyof typeof STATUS_COLORS>).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {STATUS_COLORS[status].icon} {status.charAt(0).toUpperCase() + status.slice(1)} (
              {statusCounts[status as keyof typeof statusCounts]})
            </button>
          ))}
        </div>

        {/* Bids List */}
        {filteredBids.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">
              {filter ? `No bids with status "${filter}" yet.` : "You haven't tracked any bids yet."}
            </p>
            <Link href="/tenders" className="text-blue-600 hover:text-blue-700 font-semibold">
              Browse tenders and track your first bid →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBids.map((bid) => {
              const colors = STATUS_COLORS[bid.status];
              return (
                <div key={bid.id} className={`${colors.bg} border border-gray-200 rounded-lg p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${colors.text}`}>
                          {colors.icon} {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">Tender ID: {bid.tender_id}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Tracked {new Date(bid.created_at).toLocaleDateString()}
                        {bid.submitted_at && ` • Submitted ${new Date(bid.submitted_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(bid.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>

                  {bid.notes && (
                    <div className="mb-4 p-3 bg-white bg-opacity-50 rounded border border-gray-200">
                      <p className="text-sm text-gray-700">{bid.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/tenders/${bid.tender_id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Tender →
                    </Link>

                    <select
                      value={bid.status}
                      onChange={(e) => handleStatusChange(bid.id, e.target.value)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50"
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
