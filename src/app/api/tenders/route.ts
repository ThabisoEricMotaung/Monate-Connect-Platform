import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RFQRecord {
  id: string;
  title: string;
  buyer_org: string | null;
  closing_date: string;
  published_date: string;
  is_public: boolean;
  source_name: string | null;
  estimated_budget: number | null;
  description: string | null;
}

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Query parameters
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const daysUntilClose = parseInt(searchParams.get('daysUntilClose') || '90');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Calculate date range in SAST (UTC+2)
    // Since closing_dates are stored with SAST timezone, compare using SAST dates
    const nowMs = Date.now();
    const now = new Date(nowMs);
    const offsetMs = (2 * 60 * 60 * 1000); // SAST is UTC+2
    const sastNow = new Date(nowMs + offsetMs);
    const today = new Date(sastNow);
    today.setUTCHours(0, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysUntilClose);

    // Build base query
    let baseQuery = supabase
      .from('rfqs')
      .select('id, title, buyer_org, closing_date, published_date, is_public, source_name, estimated_budget, description, closing_soon');

    // Add filters: status is set by nightly reconciliation (SAST-aware)
    baseQuery = baseQuery
      .eq('is_public', true)
      .eq('status', 'active')
      .not('closing_date', 'is', null)
      .gte('closing_date', today.toISOString())
      .not('title', 'ilike', '%SMOKE TEST%')
      .not('title', 'ilike', '%[TEST]%');

    if (search) {
      baseQuery = baseQuery.or(`title.ilike.%${search}%,external_reference.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (source) {
      if (source === 'null') {
        baseQuery = baseQuery.is('source_name', null);
      } else {
        baseQuery = baseQuery.ilike('source_name', `%${source}%`);
      }
    }

    // Get total count from a fresh query (with same filters and SAST timezone)
    let countQuery = supabase
      .from('rfqs')
      .select('id', { count: 'exact', head: true });

    countQuery = countQuery
      .eq('is_public', true)
      .eq('status', 'active')
      .not('closing_date', 'is', null)
      .gte('closing_date', today.toISOString())
      .not('title', 'ilike', '%SMOKE TEST%')
      .not('title', 'ilike', '%[TEST]%');

    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,external_reference.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (source) {
      if (source === 'null') {
        countQuery = countQuery.is('source_name', null);
      } else {
        countQuery = countQuery.ilike('source_name', `%${source}%`);
      }
    }

    const { count: totalCount } = await countQuery;

    // Get paginated data
    const { data: rfqs, error: rfqError } = await baseQuery
      .order('closing_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (rfqError) {
      throw rfqError;
    }

    // Transform RFQs to match tender format
    const tenders = (rfqs || []).map((rfq: RFQRecord) => ({
      id: rfq.id,
      reference_number: rfq.id.toString(),
      title: rfq.title,
      description: rfq.description,
      buyer_normalized: rfq.buyer_org || 'Unknown',
      closing_date: rfq.closing_date || new Date().toISOString(),
      created_at: rfq.published_date || new Date().toISOString(),
      source_count: 1,
      sources: rfq.source_name || 'AiForm Platform',
      estimated_budget: rfq.estimated_budget,
    }));

    return NextResponse.json({
      success: true,
      data: tenders,
      total: totalCount || 0,
      showing: tenders.length,
    });
  } catch (error) {
    console.error('Tender API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenders', details: String(error) },
      { status: 500 }
    );
  }
}
