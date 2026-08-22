'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { analyticsEvents } from '@/lib/analyticsEvents';
import { getSavedSearches, deleteSearch, updateSearch, type SavedSearch } from '@/lib/savedSearches';
import type { User } from '@supabase/supabase-js';

export default function SavedSearchesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    const getUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        loadSearches(data.user.id);
      } else {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const loadSearches = async (userId: string) => {
    try {
      const data = await getSavedSearches(userId);
      setSearches(data);
      // Track when user views saved searches
      if (data.length > 0) {
        analyticsEvents.trackSavedSearch(data[0].search_query, data[0].source || 'all', 'south africa');
      }
    } catch (error) {
      console.error('Error loading searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (searchId: number) => {
    if (!user || !confirm('Delete this saved search?')) return;

    setDeleting(searchId);
    try {
      await deleteSearch(user.id, searchId);
      setSearches(searches.filter((s) => s.id !== searchId));
    } catch (error) {
      console.error('Error deleting search:', error);
      alert('Failed to delete search');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleNotifications = async (search: SavedSearch) => {
    if (!user) return;

    try {
      await updateSearch(user.id, search.id, {
        email_notifications: !search.email_notifications,
      });
      setSearches(
        searches.map((s) =>
          s.id === search.id ? { ...s, email_notifications: !s.email_notifications } : s
        )
      );
    } catch (error) {
      console.error('Error updating search:', error);
      alert('Failed to update search');
    }
  };

  const searchUrl = (search: SavedSearch) => {
    const params = new URLSearchParams();
    if (search.search_query !== '*') params.append('search', search.search_query);
    if (search.source) params.append('source', search.source);
    if (search.budget_range) params.append('budget', search.budget_range);
    return `/tenders?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-gray-500 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 mb-4">You need to be logged in to view saved searches.</p>
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
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Navigation tabs */}
        <div className="flex gap-6 mb-8 border-b border-gray-200 pb-4">
          <Link href="/dashboard/saved-searches" className="text-blue-600 font-semibold border-b-2 border-blue-600 pb-2">
            Saved Searches
          </Link>
          <Link href="/dashboard/my-bids" className="text-gray-600 hover:text-gray-900">
            My Bids
          </Link>
          <Link href="/dashboard/analytics" className="text-gray-600 hover:text-gray-900">
            Analytics
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Searches</h1>
          <p className="text-gray-600">Manage your tender search alerts and filters.</p>
        </div>

        {searches.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">You haven&apos;t saved any searches yet.</p>
            <Link
              href="/tenders"
              className="inline-block text-blue-600 hover:text-blue-700 font-semibold"
            >
              Browse tenders and save your first search →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {searches.map((search) => (
              <div
                key={search.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {search.search_query === '*' ? 'All opportunities' : search.search_query}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Updated {new Date(search.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(search.id)}
                    disabled={deleting === search.id}
                    className="text-red-600 hover:text-red-700 disabled:text-gray-400 text-sm font-medium"
                  >
                    {deleting === search.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                {/* Filters Applied */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {search.source && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
                      {search.source}
                    </span>
                  )}
                  {search.budget_range && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">
                      {search.budget_range === '0-5m' && 'R0–5M'}
                      {search.budget_range === '5-20m' && 'R5–20M'}
                      {search.budget_range === '20m+' && 'R20M+'}
                      {search.budget_range === 'unspecified' && 'Not specified'}
                    </span>
                  )}
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs">
                    Within {search.days_until_close} days
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                  <Link
                    href={searchUrl(search)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View results →
                  </Link>
                  <button
                    onClick={() => handleToggleNotifications(search)}
                    className={`text-sm font-medium ${
                      search.email_notifications
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-gray-600 hover:text-gray-700'
                    }`}
                  >
                    {search.email_notifications ? '✉️ Notifications on' : '✉️ Notifications off'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
