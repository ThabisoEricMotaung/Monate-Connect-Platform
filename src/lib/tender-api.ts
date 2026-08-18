interface FetchOptions {
  search?: string;
  buyer?: string;
  daysUntilClose?: number;
  limit?: number;
  offset?: number;
}

export async function fetchTenders(options: FetchOptions = {}) {
  const params = new URLSearchParams();

  if (options.search) params.append('search', options.search);
  if (options.buyer) params.append('buyer', options.buyer);
  if (options.daysUntilClose !== undefined) {
    params.append('daysUntilClose', options.daysUntilClose.toString());
  }
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.offset) params.append('offset', options.offset.toString());

  try {
    const response = await fetch(`/api/tenders?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch tenders');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching tenders:', error);
    return [];
  }
}
