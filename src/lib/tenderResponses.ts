export interface TenderResponse {
  id: number;
  user_id: string;
  tender_id: number;
  status: 'draft' | 'submitted' | 'won' | 'lost';
  notes: string | null;
  uploaded_docs: string[];
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenderResponseInput {
  tender_id: number;
  status?: 'draft' | 'submitted' | 'won' | 'lost';
  notes?: string;
  uploaded_docs?: string[];
}

export async function getTenderResponses(
  userId: string,
  status?: string
): Promise<TenderResponse[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`/api/tender-responses?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch responses');
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching tender responses:', error);
    return [];
  }
}

export async function saveTenderResponse(
  userId: string,
  response: TenderResponseInput
): Promise<TenderResponse | null> {
  try {
    const res = await fetch('/api/tender-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(response),
    });

    if (!res.ok) throw new Error('Failed to save response');
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Error saving tender response:', error);
    throw error;
  }
}

export async function updateTenderResponse(
  userId: string,
  responseId: number,
  updates: Partial<TenderResponseInput>
): Promise<TenderResponse | null> {
  try {
    const res = await fetch(`/api/tender-responses/${responseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(updates),
    });

    if (!res.ok) throw new Error('Failed to update response');
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Error updating tender response:', error);
    throw error;
  }
}

export async function deleteTenderResponse(
  userId: string,
  responseId: number
): Promise<boolean> {
  try {
    const response = await fetch(`/api/tender-responses/${responseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    if (!response.ok) throw new Error('Failed to delete response');
    return true;
  } catch (error) {
    console.error('Error deleting tender response:', error);
    throw error;
  }
}
