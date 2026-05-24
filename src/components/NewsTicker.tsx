import Link from "next/link";

type TickerTone =
  | "mining"
  | "eskom"
  | "infrastructure"
  | "advert"
  | "compliance"
  | "deadline";

type TickerUpdate = {
  category: string;
  icon: string;
  text: string;
  tone: TickerTone;
  url: string;
};

const updates: TickerUpdate[] = [
  {
    category: "Mining",
    icon: "\u26CF\uFE0F",
    text: "Mining procurement update: New maintenance RFQs available in Mpumalanga",
    tone: "mining",
    url: "https://www.miningweekly.com",
  },
  {
    category: "Eskom",
    icon: "\u26A1",
    text: "Eskom supplier notice: Local contractors encouraged to keep profiles updated",
    tone: "eskom",
    url: "https://www.eskom.co.za",
  },
  {
    category: "Infrastructure",
    icon: "\uD83C\uDFD7\uFE0F",
    text: "Infrastructure opportunity: Water and sanitation RFQs closing soon",
    tone: "infrastructure",
    url: "https://www.infrastructure.gov.za",
  },
  {
    category: "Supplier Advert",
    icon: "\uD83D\uDCE2",
    text: "Supplier advert: Verified suppliers get priority visibility",
    tone: "advert",
    url: "/dashboard/profile",
  },
  {
    category: "Compliance",
    icon: "\u2705",
    text: "Compliance reminder: Keep CSD, BBBEE and tax details updated",
    tone: "compliance",
    url: "https://secure.csd.gov.za",
  },
  {
    category: "RFQ Deadline",
    icon: "\u23F0",
    text: "RFQ deadline: Submit quotes before closing windows lapse",
    tone: "deadline",
    url: "/dashboard/rfqs",
  },
];

function TickerItem({ update, index }: { update: TickerUpdate; index: number }) {
  const content = (
    <>
      <span className={`news-ticker__tag news-ticker__tag--${update.tone}`}>
        <span aria-hidden="true">{update.icon}</span>
        <span>{update.category}</span>
      </span>
      <span>{update.text}</span>
    </>
  );

  const className = "news-ticker__item";
  const key = `${update.category}-${index}`;

  if (update.url.startsWith("/")) {
    return (
      <Link
        className={className}
        href={update.url}
        key={key}
        rel="noopener noreferrer"
        target="_blank"
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      className={className}
      href={update.url}
      key={key}
      rel="noopener noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}

export default function NewsTicker() {
  const tickerItems = [...updates, ...updates];

  return (
    <aside className="news-ticker" aria-label="Enterprise procurement updates">
      <style>
        {`
          .news-ticker {
            background: #FFFFFF;
            border-top: 1px solid rgba(var(--accent-rgb), 0.28);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.82),
              0 -8px 22px rgba(20, 26, 32, 0.10);
          }

          .news-ticker__label {
            background:
              linear-gradient(180deg, color-mix(in srgb, var(--bg-panel) 94%, #FFFFFF), var(--bg-panel));
            color: var(--text-secondary);
            font-weight: 500;
          }

          .news-ticker__item {
            color: var(--text-primary);
            font-weight: 500;
            text-decoration: none;
          }

          .news-ticker__item:hover,
          .news-ticker__item:focus-visible {
            color: var(--accent-strong);
            outline: none;
          }

          .news-ticker__tag {
            font-weight: 500;
            opacity: 0.86;
          }

          .news-ticker__item:hover .news-ticker__tag,
          .news-ticker__item:focus-visible .news-ticker__tag {
            opacity: 1;
          }

          .theme-dark .news-ticker {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 54%),
              linear-gradient(90deg, #141A20, color-mix(in srgb, var(--bg-page) 82%, #315A78));
            border-top-color: rgba(var(--accent-rgb), 0.32);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.12),
              0 -10px 24px rgba(0, 0, 0, 0.34);
          }

          .theme-dark .news-ticker__label {
            background:
              linear-gradient(180deg, color-mix(in srgb, var(--bg-panel) 88%, #FFFFFF), var(--bg-panel));
            color: var(--text-secondary);
          }
        `}
      </style>
      <div className="news-ticker__label">Procurement Wire</div>
      <div className="news-ticker__viewport">
        <div className="news-ticker__track">
          {tickerItems.map((update, index) => (
            <TickerItem
              index={index}
              key={`${update.category}-${index}`}
              update={update}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
