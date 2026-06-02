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
