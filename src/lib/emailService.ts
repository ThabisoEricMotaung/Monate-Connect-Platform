export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'alerts@aiformprocure.co.za',
        ...payload,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    console.log('Email sent successfully to:', payload.to);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

interface Tender {
  title: string;
  buyer_normalized: string;
  closing_date: string;
  estimated_budget: number | null;
}

export function generateTenderEmailHTML(
  searchQuery: string,
  newTenders: Tender[],
  viewUrl: string
): string {
  const tenderRows = newTenders
    .map(
      (tender) =>
        `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #111827;">${tender.title}</p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">${tender.buyer_normalized}</p>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : 'N/A'}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${tender.estimated_budget ? `R${(tender.estimated_budget / 1_000_000).toFixed(2)}M` : 'Not specified'}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #374151; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
          .content { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .tenders-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .tenders-table th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; font-weight: 600; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 6px; font-weight: 500; margin: 20px 0; }
          .footer { color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Tender Opportunities</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Matching your search: "${searchQuery}"</p>
          </div>
          <div class="content">
            <p>Hi,</p>
            <p>We found <strong>${newTenders.length}</strong> new tender opportunity${newTenders.length !== 1 ? 'ies' : ''} matching your saved search.</p>

            <table class="tenders-table">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th style="text-align: center;">Closes</th>
                  <th style="text-align: center;">Budget</th>
                </tr>
              </thead>
              <tbody>
                ${tenderRows}
              </tbody>
            </table>

            <a href="${viewUrl}" class="button">View All Results</a>

            <p style="color: #6b7280; font-size: 14px;">
              You can manage your saved searches anytime in your <a href="https://www.aiformprocure.co.za/dashboard/saved-searches">dashboard</a>.
            </p>

            <div class="footer">
              <p>AiForm Procure | Tender Alerts</p>
              <p>You're receiving this because you saved this search. <a href="#">Manage preferences</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
