import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSastAdjustedToday } from '@/lib/opportunityStatsQuery';

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
  created_at: string;
}

const SORT_VALUES = ['recent', 'closing-soon', 'closing-later'] as const;
type TenderSort = (typeof SORT_VALUES)[number];

function parseSort(value: string | null): TenderSort {
  return SORT_VALUES.includes(value as TenderSort) ? (value as TenderSort) : 'recent';
}

/**
 * Filterable query builder interface for type safety
 */
interface FilterableQuery {
  eq(column: string, value: unknown): FilterableQuery;
  not(column: string, operator: string, value: unknown): FilterableQuery;
  gte(column: string, value: unknown): FilterableQuery;
  lte(column: string, value: unknown): FilterableQuery;
  is(column: string, value: unknown): FilterableQuery;
  ilike(column: string, value: unknown): FilterableQuery;
  or(filter: string): FilterableQuery;
  lt(column: string, value: unknown): FilterableQuery;
}

/**
 * Apply unified base filters for opportunity queries.
 * Ensures consistency between tenders API and homepage stats.
 */
function applyBaseOpportunityFilters(query: FilterableQuery): FilterableQuery {
  return query
    .eq('is_public', true)
    .eq('status', 'active')
    .not('closing_date', 'is', null)
    .not('title', 'ilike', '%SMOKE TEST%')
    .not('title', 'ilike', '%[TEST]%');
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
    const budget = searchParams.get('budget') || '';
    const sort = parseSort(searchParams.get('sort'));
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Calculate date range using unified SAST timezone handling
    const today = getSastAdjustedToday();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysUntilClose);

    // Build base query with unified filters
    let baseQuery = supabase
      .from('rfqs')
      .select('id, title, buyer_org, closing_date, published_date, created_at, is_public, source_name, estimated_budget, description, closing_soon');

    baseQuery = applyBaseOpportunityFilters(baseQuery)
      .gte('closing_date', today.toISOString())
      .lte('closing_date', targetDate.toISOString());

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
    if (budget === 'unspecified') baseQuery = baseQuery.is('estimated_budget', null);
    if (budget === '0-5m') baseQuery = baseQuery.gte('estimated_budget', 0).lt('estimated_budget', 5_000_000);
    if (budget === '5-20m') baseQuery = baseQuery.gte('estimated_budget', 5_000_000).lt('estimated_budget', 20_000_000);
    if (budget === '20m+') baseQuery = baseQuery.gte('estimated_budget', 20_000_000);

    // Get total count from a fresh query (with same unified filters)
    let countQuery = supabase
      .from('rfqs')
      .select('id', { count: 'exact', head: true });

    countQuery = applyBaseOpportunityFilters(countQuery)
      .gte('closing_date', today.toISOString())
      .lte('closing_date', targetDate.toISOString());

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
    if (budget === 'unspecified') countQuery = countQuery.is('estimated_budget', null);
    if (budget === '0-5m') countQuery = countQuery.gte('estimated_budget', 0).lt('estimated_budget', 5_000_000);
    if (budget === '5-20m') countQuery = countQuery.gte('estimated_budget', 5_000_000).lt('estimated_budget', 20_000_000);
    if (budget === '20m+') countQuery = countQuery.gte('estimated_budget', 20_000_000);

    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString();
    let newCountQuery = supabase
      .from('rfqs')
      .select('id', { count: 'exact', head: true });

    newCountQuery = applyBaseOpportunityFilters(newCountQuery)
      .gte('closing_date', today.toISOString())
      .lte('closing_date', targetDate.toISOString())
      .gte('created_at', fortyEightHoursAgo);

    if (search) newCountQuery = newCountQuery.or(`title.ilike.%${search}%,external_reference.ilike.%${search}%,description.ilike.%${search}%`);
    if (source === 'null') newCountQuery = newCountQuery.is('source_name', null);
    else if (source) newCountQuery = newCountQuery.ilike('source_name', `%${source}%`);
    if (budget === 'unspecified') newCountQuery = newCountQuery.is('estimated_budget', null);
    if (budget === '0-5m') newCountQuery = newCountQuery.gte('estimated_budget', 0).lt('estimated_budget', 5_000_000);
    if (budget === '5-20m') newCountQuery = newCountQuery.gte('estimated_budget', 5_000_000).lt('estimated_budget', 20_000_000);
    if (budget === '20m+') newCountQuery = newCountQuery.gte('estimated_budget', 20_000_000);

    const [{ count: totalCount, error: countError }, { count: newCount, error: newCountError }] = await Promise.all([
      countQuery,
      newCountQuery,
    ]);
    if (countError) throw countError;
    if (newCountError) throw newCountError;

    // Get paginated data
    if (sort === 'recent') {
      baseQuery = baseQuery.order('created_at', { ascending: false }).order('id', { ascending: false });
    } else {
      baseQuery = baseQuery
        .order('closing_date', { ascending: sort === 'closing-soon' })
        .order('id', { ascending: sort === 'closing-soon' });
    }
    const { data: rfqs, error: rfqError } = await baseQuery.range(offset, offset + limit - 1);

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
      created_at: rfq.created_at,
      source_count: 1,
      sources: rfq.source_name || 'AiForm Platform',
      estimated_budget: rfq.estimated_budget,
    }));

    return NextResponse.json({
      success: true,
      data: tenders,
      total: totalCount || 0,
      newCount: newCount || 0,
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
