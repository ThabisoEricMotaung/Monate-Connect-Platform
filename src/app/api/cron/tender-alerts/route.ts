import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateTenderEmailHTML, sendEmail } from '@/lib/emailService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SavedSearchWithUser {
  id: number;
  user_id: string;
  search_query: string;
  source: string | null;
  budget_range: string | null;
  days_until_close: number;
  email_notifications: boolean;
  auth: {
    users: {
      email: string;
    };
  };
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

    // Get all enabled saved searches with user emails
    const { data: searches, error: searchError } = await supabase
      .from('saved_searches')
      .select(
        `
        id,
        user_id,
        search_query,
        source,
        budget_range,
        days_until_close,
        email_notifications,
        auth.users(email)
      `
      )
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
    const results = [];

    for (const search of searches as SavedSearchWithUser[]) {
      try {
        const userEmail = search.auth?.users?.email;
        if (!userEmail) continue;

        // Build search query similar to frontend
        const params = new URLSearchParams();
        if (search.search_query !== '*') {
          params.append('search', search.search_query);
        }
        if (search.source) {
          params.append('source', search.source);
        }
        params.append('daysUntilClose', search.days_until_close?.toString() || '90');
        params.append('limit', '100');

        // Query tenders API
        const tenderResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/api/tenders?${params.toString()}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!tenderResponse.ok) {
          console.error(`Failed to fetch tenders for search ${search.id}`);
          continue;
        }

        const tenderData = await tenderResponse.json();
        const newTenders = tenderData.data || [];

        if (newTenders.length > 0) {
          // TODO: In production, track which tenders were already sent for this search
          // to avoid sending duplicates. Store sent_tender_ids in saved_searches table.

          const viewUrl = `https://www.aiformprocure.co.za/tenders?${params.toString()}`;
          const emailHtml = generateTenderEmailHTML(
            search.search_query,
            newTenders.slice(0, 10), // Limit to 10 in email
            viewUrl
          );

          const sent = await sendEmail({
            to: userEmail,
            subject: `${newTenders.length} New Tender${newTenders.length !== 1 ? 's' : ''} Matching "${search.search_query}"`,
            html: emailHtml,
          });

          if (sent) {
            emailsSent++;
            results.push({
              search_id: search.id,
              user: userEmail,
              tenders_found: newTenders.length,
              email_sent: true,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing search ${search.id}:`, error);
        results.push({
          search_id: search.id,
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
