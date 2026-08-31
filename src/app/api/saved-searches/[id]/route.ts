import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface SavedSearchUpdate {
  email_notifications?: boolean;
  days_until_close?: number;
  sort?: 'recent' | 'closing-soon' | 'closing-later';
}

// DELETE: Remove a saved search
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
    const { data: search, error: fetchError } = await supabase
      .from('saved_searches')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !search || search.user_id !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete saved search' },
      { status: 500 }
    );
  }
}

// PUT: Update a saved search
export async function PUT(
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
    const body = (await request.json()) as SavedSearchUpdate;

    // Verify ownership
    const { data: search, error: fetchError } = await supabase
      .from('saved_searches')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !search || search.user_id !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('saved_searches')
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
    console.error('Error updating saved search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update saved search' },
      { status: 500 }
    );
  }
}
