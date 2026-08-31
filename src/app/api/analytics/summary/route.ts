import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Analytics service is not configured' },
      { status: 503 }
    );
  }

  const supabase = supabaseAdmin;

  try {
    // Top searched queries
    const { data: topQueries } = await supabase
      .from('saved_searches')
      .select('search_query')
      .eq('email_notifications', true)
      .order('created_at', { ascending: false })
      .limit(100);

    const queryStats = (topQueries || [])
      .filter((q) => q.search_query && q.search_query !== '*')
      .reduce(
        (acc, q) => {
          const key = q.search_query;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const topSearches = Object.entries(queryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Top viewed tenders
    const { data: topViewed } = await supabase
      .from('tender_views')
      .select('tender_id')
      .order('viewed_at', { ascending: false })
      .limit(200);

    const viewStats = (topViewed || []).reduce(
      (acc, v) => {
        acc[v.tender_id] = (acc[v.tender_id] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const topTenderIds = Object.entries(viewStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => parseInt(id));

    // Get tender titles for top viewed
    const { data: tenderDetails } = await supabase
      .from('rfqs')
      .select('id, title, buyer_org')
      .in('id', topTenderIds.length > 0 ? topTenderIds : [-1]);

    const topTenders = (tenderDetails || [])
      .map((t) => ({
        id: t.id,
        title: t.title,
        buyer: t.buyer_org || 'Unknown',
        views: viewStats[t.id] || 0,
      }))
      .sort((a, b) => b.views - a.views);

    // Bid conversion funnel
    const { data: allSearches } = await supabase
      .from('saved_searches')
      .select('id');
    const { data: allBids } = await supabase
      .from('tender_responses')
      .select('id');

    const totalSearches = allSearches?.length || 0;
    const totalBids = allBids?.length || 0;

    // Source distribution
    const { data: sources } = await supabase
      .from('saved_searches')
      .select('source');

    const sourceStats = (sources || [])
      .filter((s) => s.source)
      .reduce(
        (acc, s) => {
          const key = s.source || 'All';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    const sourceDistribution = Object.entries(sourceStats)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count]) => ({ source, count }));

    return NextResponse.json({
      topSearches,
      topTenders,
      funnel: {
        totalSearches,
        totalBids,
        conversionRate: totalSearches > 0 ? ((totalBids / totalSearches) * 100).toFixed(2) : 0,
      },
      sourceDistribution,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
