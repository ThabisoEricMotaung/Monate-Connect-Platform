import { useAuth } from '@/app/auth/AuthProvider';

export interface SavedSearch {
  id: number;
  user_id: string;
  search_query: string;
  source: string | null;
  budget_range: string | null;
  days_until_close: number;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveSearchRequest {
  search_query: string;
  source?: string | null;
  budget_range?: string | null;
  days_until_close?: number;
  email_notifications?: boolean;
}

async function getAuthHeaders() {
  // If you have an auth context, get the user ID from there
  // For now, we'll rely on the backend to extract it from the session
  return {
    'Content-Type': 'application/json',
  };
}

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/saved-searches', {
      method: 'GET',
      headers: {
        ...headers,
        'x-user-id': userId,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch saved searches');
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }
}

export async function saveSearch(
  userId: string,
  search: SaveSearchRequest
): Promise<SavedSearch | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/saved-searches', {
      method: 'POST',
      headers: {
        ...headers,
        'x-user-id': userId,
      },
      body: JSON.stringify(search),
    });

    if (response.status === 409) {
      throw new Error('This search is already saved');
    }
    if (!response.ok) throw new Error('Failed to save search');

    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
}

export async function deleteSearch(userId: string, searchId: number): Promise<boolean> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/saved-searches/${searchId}`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'x-user-id': userId,
      },
    });

    if (!response.ok) throw new Error('Failed to delete search');
    return true;
  } catch (error) {
    console.error('Error deleting search:', error);
    throw error;
  }
}

export async function updateSearch(
  userId: string,
  searchId: number,
  updates: Partial<SaveSearchRequest>
): Promise<SavedSearch | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/saved-searches/${searchId}`, {
      method: 'PUT',
      headers: {
        ...headers,
        'x-user-id': userId,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Failed to update search');
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error('Error updating search:', error);
    throw error;
  }
}
