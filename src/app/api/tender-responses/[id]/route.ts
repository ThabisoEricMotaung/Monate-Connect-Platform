import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface ResponseUpdate {
  status?: 'draft' | 'submitted' | 'won' | 'lost';
  notes?: string;
  uploaded_docs?: string[];
}

// DELETE: Remove a tender response
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: response, error: fetchError } = await supabase
      .from('tender_responses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !response || response.user_id !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { error } = await supabase
      .from('tender_responses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tender response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete response' },
      { status: 500 }
    );
  }
}

// PUT: Update a tender response
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as ResponseUpdate;

    // Verify ownership
    const { data: response, error: fetchError } = await supabase
      .from('tender_responses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !response || response.user_id !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('tender_responses')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating tender response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update response' },
      { status: 500 }
    );
  }
}
