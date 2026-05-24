const updates = [
  {
    category: "Mining",
    icon: "⛏️",
    text: "Mining procurement update: New maintenance RFQs available in Mpumalanga",
    tone: "mining",
  },
  {
    category: "Eskom",
    icon: "⚡",
    text: "Eskom supplier notice: Local contractors encouraged to keep profiles updated",
    tone: "eskom",
  },
  {
    category: "Infrastructure",
    icon: "🏗️",
    text: "Infrastructure opportunity: Water and sanitation RFQs closing soon",
    tone: "infrastructure",
  },
  {
    category: "Supplier Advert",
    icon: "📢",
    text: "Supplier advert: Verified suppliers get priority visibility",
    tone: "advert",
  },
  {
    category: "Compliance",
    icon: "✅",
    text: "Compliance reminder: Keep CSD, BBBEE and tax details updated",
    tone: "compliance",
  },
  {
    category: "RFQ Deadline",
    icon: "⏰",
    text: "RFQ deadline: Submit quotes before closing windows lapse",
    tone: "deadline",
  },
];

export default function NewsTicker() {
  const tickerItems = [...updates, ...updates];

  return (
    <aside className="news-ticker" aria-label="Enterprise procurement updates">
      <div className="news-ticker__label">Procurement Wire</div>
      <div className="news-ticker__viewport">
        <div className="news-ticker__track">
          {tickerItems.map((update, index) => (
            <span
              className="news-ticker__item"
              key={`${update.category}-${index}`}
            >
              <span
                className={`news-ticker__tag news-ticker__tag--${update.tone}`}
              >
                <span aria-hidden="true">{update.icon}</span>
                <span>{update.category}</span>
              </span>
              <span>{update.text}</span>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
