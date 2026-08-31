import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Analytics service is not configured' },
      { status: 503 }
    );
  }

  const supabase = supabaseAdmin;

  try {
    const { tender_id, session_id } = await request.json();

    if (!tender_id) {
      return NextResponse.json({ error: 'tender_id required' }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id');

    // Insert view record
    const { error } = await supabase.from('tender_views').insert({
      tender_id,
      user_id: userId,
      session_id,
      viewed_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}
