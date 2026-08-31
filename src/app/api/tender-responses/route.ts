import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface TenderResponse {
  id?: number;
  tender_id: number;
  status?: 'draft' | 'submitted' | 'won' | 'lost';
  notes?: string;
  uploaded_docs?: string[];
}

// GET: List user's tender responses
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('tender_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching tender responses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

// POST: Create or update a tender response
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as TenderResponse;

    // Check if response already exists
    const { data: existing } = await supabase
      .from('tender_responses')
      .select('id')
      .eq('user_id', userId)
      .eq('tender_id', body.tender_id)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('tender_responses')
        .update({
          status: body.status || 'draft',
          notes: body.notes,
          uploaded_docs: body.uploaded_docs || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      // Create new
      const { data, error } = await supabase
        .from('tender_responses')
        .insert({
          user_id: userId,
          tender_id: body.tender_id,
          status: body.status || 'draft',
          notes: body.notes,
          uploaded_docs: body.uploaded_docs || [],
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving tender response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save response' },
      { status: 500 }
    );
  }
}
