import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { applyLivePublicOpportunityFilters } from '@/lib/opportunityStatsQuery';
import { TENDER_LISTING_COLUMNS, toTenderListing, type TenderListingRecord } from '@/lib/tenderListing';

export const dynamic = 'force-dynamic';

const SORT_VALUES = ['recent', 'closing-soon', 'closing-later'] as const;
type TenderSort = (typeof SORT_VALUES)[number];

function parseSort(value: string | null): TenderSort {
  return SORT_VALUES.includes(value as TenderSort) ? (value as TenderSort) : 'recent';
}

/**
 * Apply unified base filters for opportunity queries.
 * Ensures consistency between tenders API and homepage stats.
 * Uses 'any' to accept Supabase's complex PostgrestFilterBuilder type.
 */

export async function GET(request: NextRequest) {
  try {
    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { searchParams } = new URL(request.url);

    // Query parameters
    const search = searchParams.get('search') || '';
    const source = searchParams.get('source') || '';
    const province = searchParams.get('province') || '';
    const daysParam = searchParams.get('daysUntilClose');
    const daysUntilClose = daysParam ? parseInt(daysParam) : null;
    const budget = searchParams.get('budget') || '';
    const sort = parseSort(searchParams.get('sort'));
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const now = new Date();
    const targetDate = daysUntilClose && daysUntilClose > 0
      ? new Date(now.getTime() + daysUntilClose * 24 * 60 * 60 * 1000)
      : null;

    // Build base query with unified filters
    let baseQuery = supabase
      .from('rfqs')
      .select(TENDER_LISTING_COLUMNS);

    baseQuery = applyLivePublicOpportunityFilters(baseQuery, now);
    if (targetDate) baseQuery = baseQuery.lte('closing_date', targetDate.toISOString());

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
    if (province) {
      baseQuery = baseQuery.eq('province', province);
    }
    if (budget === 'unspecified') baseQuery = baseQuery.is('estimated_budget', null);
    if (budget === '0-5m') baseQuery = baseQuery.gte('estimated_budget', 0).lt('estimated_budget', 5_000_000);
    if (budget === '5-20m') baseQuery = baseQuery.gte('estimated_budget', 5_000_000).lt('estimated_budget', 20_000_000);
    if (budget === '20m+') baseQuery = baseQuery.gte('estimated_budget', 20_000_000);

    // Get total count from a fresh query (with same unified filters)
    let countQuery = supabase
      .from('rfqs')
      .select('id', { count: 'exact', head: true });

    countQuery = applyLivePublicOpportunityFilters(countQuery, now);
    if (targetDate) countQuery = countQuery.lte('closing_date', targetDate.toISOString());

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
    if (province) {
      countQuery = countQuery.eq('province', province);
    }
    if (budget === 'unspecified') countQuery = countQuery.is('estimated_budget', null);
    if (budget === '0-5m') countQuery = countQuery.gte('estimated_budget', 0).lt('estimated_budget', 5_000_000);
    if (budget === '5-20m') countQuery = countQuery.gte('estimated_budget', 5_000_000).lt('estimated_budget', 20_000_000);
    if (budget === '20m+') countQuery = countQuery.gte('estimated_budget', 20_000_000);

    const fortyEightHoursAgo = new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString();
    let newCountQuery = supabase
      .from('rfqs')
      .select('id', { count: 'exact', head: true });

    newCountQuery = applyLivePublicOpportunityFilters(newCountQuery, now)
      .gte('created_at', fortyEightHoursAgo);
    if (targetDate) newCountQuery = newCountQuery.lte('closing_date', targetDate.toISOString());

    if (search) newCountQuery = newCountQuery.or(`title.ilike.%${search}%,external_reference.ilike.%${search}%,description.ilike.%${search}%`);
    if (source === 'null') newCountQuery = newCountQuery.is('source_name', null);
    else if (source) newCountQuery = newCountQuery.ilike('source_name', `%${source}%`);
    if (province) {
      newCountQuery = newCountQuery.eq('province', province);
    }
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

    const tenders = ((rfqs || []) as TenderListingRecord[]).map(toTenderListing);

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
