'use client';

import { useState } from 'react';
import { saveTenderResponse, type TenderResponse } from '@/lib/tenderResponses';

interface BidResponseModalProps {
  tenderId: number;
  tenderTitle: string;
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (response: TenderResponse) => void;
}

export function BidResponseModal({
  tenderId,
  tenderTitle,
  userId,
  isOpen,
  onClose,
  onSuccess,
}: BidResponseModalProps) {
  const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Please log in to save your bid');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await saveTenderResponse(userId, {
        tender_id: tenderId,
        status,
        notes: notes || undefined,
      });

      if (response) {
        onSuccess?.(response);
        onClose();
        setNotes('');
        setStatus('draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bid');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Track Your Bid</h2>
          <p className="text-sm text-gray-600 mt-1">{tenderTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bid Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'submitted')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft (Not yet submitted)</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your bid (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Bid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
