import { isDateOnlyDeadline } from '@/lib/southAfricaTime';

interface TenderCardProps {
  tender: {
    id: number;
    reference_number?: string | null;
    title: string;
    /** Readable work title derived from the stored text; null when it has none. */
    display_title?: string | null;
    description?: string | null;
    /** The description is one contract of a multi-contract notice. */
    description_is_partial?: boolean;
    /** Eligibility or submission requirements are stated on the detail page. */
    has_further_requirements?: boolean;
    buyer_normalized?: string | null;
    province?: string | null;
    closing_date?: string | null;
    created_at?: string | null;
  };
}

const TIME_ZONE = 'Africa/Johannesburg';
const DAY_MS = 24 * 60 * 60 * 1000;

const exactDateTimeFormat = new Intl.DateTimeFormat('en-ZA', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const exactDateFormat = new Intl.DateTimeFormat('en-ZA', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// en-CA yields YYYY-MM-DD, which lets us compare calendar days in SAST.
const calendarDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days from `from` to `to`, measured in South African time. */
function calendarDaysBetween(from: Date, to: Date): number {
  const [fy, fm, fd] = calendarDayFormat.format(from).split('-').map(Number);
  const [ty, tm, td] = calendarDayFormat.format(to).split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

function normaliseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

const TRAILING_ELLIPSIS = /(?:\.{3}|…)$/;
const COLLECTOR_TITLE_LIMIT = 200;

/**
 * True when `desc` is the untruncated form of `heading`: it starts with the
 * heading and continues only to finish the word the heading was cut in (plus
 * an optional ellipsis). Any further text is real content and is kept.
 */
function isUntruncatedForm(desc: string, heading: string): boolean {
  const cutHeading = heading.replace(TRAILING_ELLIPSIS, '').trimEnd();
  if (!cutHeading || desc.length <= cutHeading.length || !desc.startsWith(cutHeading)) return false;
  const remainder = desc.slice(cutHeading.length).replace(TRAILING_ELLIPSIS, '');
  return /^\S*$/.test(remainder);
}

/**
 * True when the description adds nothing beyond the title: an exact repeat, a
 * repeat prefixed with the record's own reference ("<reference> - <title>"),
 * or the full text from which the title was truncated.
 */
function isDuplicateOfTitle(description: string, title: string, reference?: string | null): boolean {
  const desc = normaliseText(description);
  const heading = normaliseText(title);
  // Collectors cap titles at 200 characters (cleanTitle in TenderCollectorBase),
  // so a title at that length may be a cut-off copy of the description.
  const titleWasTruncated = title.trim().length >= COLLECTOR_TITLE_LIMIT || TRAILING_ELLIPSIS.test(title.trim());
  const ref = reference ? normaliseText(reference) : '';

  const candidates = [desc];
  for (const separator of [' - ', ' – ']) {
    if (ref && desc.startsWith(`${ref}${separator}`)) candidates.push(desc.slice(ref.length + separator.length));
  }

  return candidates.some((text) =>
    !text || text === heading || (titleWasTruncated && isUntruncatedForm(text, heading)),
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M5 8h14M7 8V5h10v3M7 8v11M17 8v11M9 12h6M9 16h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

const BADGE = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium';

function ClosingBadge({ closingDate, now }: { closingDate: Date | null; now: Date }) {
  if (!closingDate) {
    return (
      <span className={`${BADGE} bg-[var(--bg-panel)] text-[var(--text-secondary)]`}>
        Closing date not provided
      </span>
    );
  }

  const isClosed = closingDate.getTime() <= now.getTime();
  const days = calendarDaysBetween(now, closingDate);
  const tone = isClosed
    ? 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
    : days <= 7
      ? 'bg-[rgba(var(--warning-rgb),0.12)] text-[var(--warning)]'
      : 'bg-[rgba(var(--accent-rgb),0.08)] text-[var(--accent-strong)]';

  // The source published a date but no time: show the date only, never the
  // stored end-of-day placeholder as if it were the official closing time.
  if (isDateOnlyDeadline(closingDate)) {
    return (
      <time dateTime={calendarDayFormat.format(closingDate)} className={`${BADGE} ${tone}`}>
        <span>{`${isClosed ? 'Closed' : 'Closing'} ${exactDateFormat.format(closingDate)}`}</span>
        <span aria-hidden="true">·</span>
        <span className="font-normal">time not provided</span>
      </time>
    );
  }

  const exact = exactDateTimeFormat.format(closingDate);
  const label = isClosed
    ? 'Closed'
    : days <= 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `Closes in ${days} days`;

  return (
    <time dateTime={closingDate.toISOString()} className={`${BADGE} ${tone}`}>
      <span>{label}</span>
      <span aria-hidden="true">·</span>
      <span className="font-normal">{exact} SAST</span>
    </time>
  );
}

function AddedBadge({ createdAt, now }: { createdAt: Date; now: Date }) {
  const days = Math.max(0, calendarDaysBetween(createdAt, now));
  const label = days === 0 ? 'Added today' : days === 1 ? 'Added yesterday' : `Added ${days} days ago`;

  return (
    <time
      dateTime={createdAt.toISOString()}
      title={`Added ${exactDateFormat.format(createdAt)}`}
      className={`${BADGE} bg-[var(--bg-panel)] text-[var(--text-secondary)]`}
    >
      {label}
      <span className="sr-only"> ({exactDateFormat.format(createdAt)})</span>
    </time>
  );
}

export function TenderCard({ tender }: TenderCardProps) {
  const now = new Date();
  const closingDate = parseDate(tender.closing_date);
  const createdAt = parseDate(tender.created_at);
  const buyer = tender.buyer_normalized?.trim();
  const province = tender.province?.trim();
  const reference = tender.reference_number?.trim();
  const description = tender.description?.trim();
  // Callers that predate display_title (undefined) keep showing the stored title.
  const heading = tender.display_title === undefined ? tender.title : tender.display_title?.trim();
  const showDescription = Boolean(description) && !(heading && isDuplicateOfTitle(description!, heading, reference));
  const linkLabel = heading || (reference ? `tender ${reference}` : 'tender');

  return (
    <article className="rounded-xl border border-[rgba(var(--accent-soft-rgb),0.45)] bg-[var(--bg-card)] p-5 transition-[border-color,box-shadow] duration-150 hover:border-[rgba(var(--accent-rgb),0.45)] hover:shadow-[0_2px_8px_var(--shadow-md)] sm:p-6">
      {heading ? (
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[var(--text-heading)] sm:text-xl">
          {heading}
        </h3>
      ) : (
        <h3 className="text-lg font-semibold italic leading-snug text-[var(--text-muted)] sm:text-xl">
          Tender title not published in source listing
        </h3>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
        {province && (
          <span className="inline-flex items-center gap-1.5">
            <PinIcon />
            <span className="sr-only">Province: </span>
            {province}
          </span>
        )}
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <BuildingIcon />
          {buyer ? (
            <span className="break-words">
              <span className="sr-only">Issuing organisation: </span>
              {buyer}
            </span>
          ) : (
            <span className="italic">Issuing organisation not provided</span>
          )}
        </span>
      </div>

      {showDescription && (
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-[var(--text-body)]">
          {tender.description_is_partial && (
            <span className="font-medium text-[var(--text-secondary)]">One of multiple contracts: </span>
          )}
          {description}
        </p>
      )}

      {tender.has_further_requirements && (
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">See details for eligibility and submission requirements</p>
      )}

      {reference && (
        <p className="mt-2 line-clamp-2 break-words text-xs text-[var(--text-muted)]">
          Ref: <span className="font-mono">{reference}</span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ClosingBadge closingDate={closingDate} now={now} />
        {createdAt && <AddedBadge createdAt={createdAt} now={now} />}
        <a
          href={`/tenders/${tender.id}`}
          className="ml-auto rounded text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          View details<span className="sr-only">: {linkLabel}</span>
          <span aria-hidden="true"> →</span>
        </a>
      </div>
    </article>
  );
}
