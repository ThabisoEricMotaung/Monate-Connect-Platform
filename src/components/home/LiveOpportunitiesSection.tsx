import Link from 'next/link';

interface RFQRecord {
  id: string;
  title: string;
  buyer_org: string | null;
  closing_date: string;
}

interface Opportunity {
  id: string;
  title: string;
  buyer_normalized: string;
  closing_date: string;
}

async function fetchLiveOpportunities(): Promise<Opportunity[]> {
  try {
    const response = await fetch(
      'https://' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('https://')[1] + '/rest/v1/rfqs?select=id,title,buyer_org,closing_date&is_public=eq.true&status=eq.open&order=closing_date.asc&limit=3',
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) return [];

    const data: RFQRecord[] = await response.json();
    return data.map((opp): Opportunity => ({
      id: opp.id,
      title: opp.title,
      buyer_normalized: opp.buyer_org || 'Unknown',
      closing_date: opp.closing_date,
    }));
  } catch (error) {
    console.error('Failed to fetch opportunities:', error);
    return [];
  }
}

export default async function LiveOpportunitiesSection() {
  const opportunities = await fetchLiveOpportunities();

  if (!opportunities.length) return null;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-6 lg:py-14">
      <div className="flex flex-col gap-3 border-t border-strong pt-8">
        <p className="newspaper-kicker">Browse opportunities</p>
        <h2 className="font-display text-3xl font-semibold text-heading">Latest public procurement opportunities</h2>
      </div>

      <div className="space-y-3">
        {opportunities.map((opp) => {
          const closing = new Date(opp.closing_date);
          const today = new Date();
          const daysLeft = Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysLeft <= 7;

          return (
            <Link
              key={opp.id}
              href={`/tenders/${opp.id}`}
              className="block rounded-lg border border-[#e8e0cc] bg-white p-4 transition hover:border-accent hover:shadow-md sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-heading line-clamp-2">{opp.title}</h3>
                    {isUrgent && (
                      <span className="inline-block text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded whitespace-nowrap">
                        {daysLeft} days
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-secondary">{opp.buyer_normalized}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted uppercase font-semibold">Closes</p>
                  <p className="text-sm font-semibold text-heading">{closing.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/tenders"
        className="inline-flex text-sm font-bold text-accent transition hover:text-accent-strong"
      >
        Browse all opportunities →
      </Link>
    </section>
  );
}
