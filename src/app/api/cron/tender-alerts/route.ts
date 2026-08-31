import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTenderEmailHTML, sendEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';

interface SavedSearch {
  id: number;
  user_id: string;
  search_query: string;
  source: string | null;
  budget_range: string | null;
  days_until_close: number;
  email_notifications: boolean;
}

// Security: Check cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret');
  return secret === process.env.CRON_SECRET;
}

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting tender alert job...');

    // Initialize Supabase client at request time, not at module load
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Get all enabled saved searches
    const { data: searches, error: searchError } = await supabase
      .from('saved_searches')
      .select('id,user_id,search_query,source,budget_range,days_until_close,email_notifications')
      .eq('email_notifications', true);

    if (searchError) throw searchError;
    if (!searches || searches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active searches to process',
        processed: 0,
      });
    }

    let emailsSent = 0;
    const results: unknown[] = [];

    for (const search of searches) {
      const searchData = search as unknown as SavedSearch;
      try {
        // Get user email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(searchData.user_id);
        const userEmail = userData.user?.email;
        if (!userEmail) continue;

        // Build search query similar to frontend
        const params = new URLSearchParams();
        if (searchData.search_query !== '*') {
          params.append('search', searchData.search_query);
        }
        if (searchData.source) {
          params.append('source', searchData.source);
        }
        params.append('daysUntilClose', searchData.days_until_close?.toString() || '90');
        params.append('limit', '100');

        // Query tenders API
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001');

        const tenderResponse = await fetch(
          `${appUrl}/api/tenders?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!tenderResponse.ok) {
          console.error(`Failed to fetch tenders for search ${searchData.id}`);
          continue;
        }

        const tenderData = await tenderResponse.json();
        const newTenders = tenderData.data || [];

        if (newTenders.length > 0) {
          // TODO: In production, track which tenders were already sent for this search
          // to avoid sending duplicates. Store sent_tender_ids in saved_searches table.

          const viewUrl = `https://www.aiformprocure.co.za/tenders?${params.toString()}`;
          const emailHtml = generateTenderEmailHTML(
            searchData.search_query,
            newTenders.slice(0, 10), // Limit to 10 in email
            viewUrl
          );

          const sent = await sendEmail({
            to: userEmail,
            subject: `${newTenders.length} New Tender${newTenders.length !== 1 ? 's' : ''} Matching "${searchData.search_query}"`,
            html: emailHtml,
          });

          if (sent) {
            emailsSent++;
            results.push({
              search_id: searchData.id,
              user: userEmail,
              tenders_found: newTenders.length,
              email_sent: true,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing search ${searchData.id}:`, error);
        results.push({
          search_id: searchData.id,
          error: String(error),
        });
      }
    }

    console.log(`Tender alert job complete. Emails sent: ${emailsSent}`);

    return NextResponse.json({
      success: true,
      message: 'Tender alert job completed',
      processed: searches.length,
      emailsSent,
      results,
    });
  } catch (error) {
    console.error('Tender alert job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process tender alerts',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
