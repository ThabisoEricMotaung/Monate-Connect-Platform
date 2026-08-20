import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
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
