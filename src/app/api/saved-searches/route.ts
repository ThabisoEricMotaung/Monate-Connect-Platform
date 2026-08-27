import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SavedSearch {
  id?: number;
  search_query: string;
  source?: string | null;
  budget_range?: string | null;
  days_until_close?: number;
  email_notifications?: boolean;
  sort?: 'recent' | 'closing-soon' | 'closing-later';
}

// GET: List user's saved searches
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

// POST: Create a new saved search
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SavedSearch;

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: userId,
        search_query: body.search_query,
        source: body.source || null,
        budget_range: body.budget_range || null,
        days_until_close: body.days_until_close || 90,
        email_notifications: body.email_notifications !== false,
        sort: body.sort || 'recent',
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate (unique constraint)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This search is already saved' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error saving search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save search' },
      { status: 500 }
    );
  }
}
