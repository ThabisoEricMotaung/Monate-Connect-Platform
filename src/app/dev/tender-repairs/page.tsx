import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { TenderCard } from '@/components/TenderCard';
import { TENDER_LISTING_COLUMNS, toTenderListing, type TenderListingRecord } from '@/lib/tenderListing';

/**
 * DEVELOPMENT ONLY. Shows how live tenders would list after the dry-run
 * repairs in output/tender-repairs/repair-*.json (written by the preview
 * scripts) are applied. Reads those local files and the current records;
 * it never fetches source pages and never writes. 404 outside `next dev`.
 */
export const dynamic = 'force-dynamic';

const REPAIR_DIR = path.join(process.cwd(), 'output', 'tender-repairs');
const APPLIED_FIELDS = ['title', 'description', 'closing_date'] as const;

interface RepairEntry {
  id: number;
  source_name: string;
  reference: string;
  source_url: string;
  proposed: Partial<Record<string, string | null>>;
}

function readRepairs(): RepairEntry[] {
  if (!fs.existsSync(REPAIR_DIR)) return [];
  return fs
    .readdirSync(REPAIR_DIR)
    .filter((name) => /^repair-.+\.json$/.test(name))
    .flatMap((name) => JSON.parse(fs.readFileSync(path.join(REPAIR_DIR, name), 'utf8')) as RepairEntry[]);
}

export default async function TenderRepairsPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const repairs = readRepairs();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const { data, error } = repairs.length
    ? await supabase.from('rfqs').select(TENDER_LISTING_COLUMNS).in('id', repairs.map((repair) => repair.id))
    : { data: [], error: null };
  const records = new Map(((data ?? []) as TenderListingRecord[]).map((record) => [record.id, record]));

  const sources = [...new Set(repairs.map((repair) => repair.source_name))].sort();

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Development preview — not applied</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Recovered tender listings</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Each card shows a live record as it would list after its verified dry-run repair. The current
          listing heading and the stored official text are shown underneath for comparison. Source files:{' '}
          <code>output/tender-repairs/repair-*.json</code>.
        </p>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800">Could not load records: {error.message}</p>}
        {repairs.length === 0 && (
          <p className="mt-6 text-sm text-gray-600">No repair files found. Run the preview scripts first.</p>
        )}

        {sources.map((source) => {
          const entries = repairs.filter((repair) => repair.source_name === source);
          return (
            <section key={source} className="mt-10">
              <h2 className="text-xl font-semibold text-gray-900">
                {source} <span className="text-sm font-normal text-gray-500">({entries.length} records)</span>
              </h2>
              <div className="mt-4 space-y-6">
                {entries.map((repair) => {
                  const record = records.get(repair.id);
                  if (!record) {
                    return <p key={repair.id} className="text-sm text-red-700">Record {repair.id} not found.</p>;
                  }
                  const repaired: TenderListingRecord = { ...record };
                  for (const field of APPLIED_FIELDS) {
                    if (field in repair.proposed) Object.assign(repaired, { [field]: repair.proposed[field] ?? null });
                  }
                  const before = toTenderListing(record);
                  const after = toTenderListing(repaired);
                  return (
                    <div key={repair.id}>
                      <TenderCard tender={after} />
                      <dl className="mt-2 grid gap-1 px-1 text-xs text-gray-500 sm:grid-cols-[10rem_1fr]">
                        <dt className="font-medium">Record</dt>
                        <dd>{repair.id} · <a className="underline" href={repair.source_url}>source page</a></dd>
                        <dt className="font-medium">Current heading</dt>
                        <dd>{before.display_title ?? <em>none (shows “title not published”)</em>}</dd>
                        <dt className="font-medium">Official text (stored)</dt>
                        <dd>{after.title}</dd>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
