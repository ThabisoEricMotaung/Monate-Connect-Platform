import Link from "next/link"
import { getPublicOpportunityStats } from "@/lib/publicOpportunityStats"
import { getLocale, getTranslations } from "next-intl/server"
import { localeFormatTag, normalizeLocale } from "@/i18n/config"

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0ebe0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0ebe0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0ebe0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8.5 13.4 11l2.6 1-2.6 1L12 15.5 10.6 13 8 12l2.6-1L12 8.5Z" />
    </svg>
  )
}

function ShieldCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f0ebe0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 5.5 5.5v5.8c0 4 2.6 7.6 6.5 9.1 3.9-1.5 6.5-5.1 6.5-9.1V5.5L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function SkylineBackdrop() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08, pointerEvents: "none" }}
      viewBox="0 0 1200 260"
      preserveAspectRatio="xMidYMax slice"
    >
      <g fill="#1a3a2a">
        <rect x="40" y="140" width="26" height="110" />
        <rect x="70" y="115" width="34" height="135" />
        <rect x="108" y="150" width="22" height="100" />
        <rect x="300" y="90" width="40" height="160" />
        <rect x="345" y="70" width="26" height="180" />
        <rect x="376" y="110" width="30" height="140" />
        <rect x="560" y="60" width="46" height="190" />
        <rect x="612" y="100" width="28" height="150" />
        <rect x="850" y="120" width="32" height="130" />
        <rect x="888" y="85" width="38" height="165" />
        <rect x="932" y="130" width="24" height="120" />
        <rect x="1080" y="105" width="30" height="145" />
        <rect x="1116" y="145" width="24" height="105" />
      </g>
      <rect x="0" y="0" width="1200" height="260" fill="url(#stat-skyline-fade)" />
      <defs>
        <linearGradient id="stat-skyline-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#faf7f2" stopOpacity="1" />
          <stop offset="45%" stopColor="#faf7f2" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#faf7f2" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const STAT_STYLES = `
  .osb-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }
  .osb-item + .osb-item {
    border-left: 1px solid #e0d5b8;
  }
  @media (max-width: 860px) {
    .osb-grid { grid-template-columns: 1fr 1fr; }
    .osb-item:nth-child(3) { border-left: none; }
    .osb-item:nth-child(3), .osb-item:nth-child(4) { border-top: 1px solid #e0d5b8; }
  }
  @media (max-width: 460px) {
    .osb-grid { grid-template-columns: 1fr; }
    .osb-item + .osb-item { border-left: none; border-top: 1px solid #e0d5b8; }
  }
  .osb-cta {
    background: linear-gradient(135deg, #d4a843 0%, #c8a060 40%, #e0b870 70%, #c8a060 100%);
    background-size: 200% auto;
    transition: transform 220ms ease, box-shadow 220ms ease, background-position 500ms ease;
  }
  .osb-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(200,160,96,0.32);
    background-position: right center;
  }
`

export default async function OpportunityStatsBanner() {
  const [stats, locale, t] = await Promise.all([getPublicOpportunityStats(), getLocale(), getTranslations("home")])
  if (!stats) return null
  const formatLocale = localeFormatTag(normalizeLocale(locale))

  const items = [
    {
      icon: <SparkleIcon />,
      value: stats.totalOpenRfqs.toLocaleString(formatLocale),
      label: `Total Open RFQs · ${stats.liveOpportunities.toLocaleString(formatLocale)} live and accepting bids`,
    },
    { icon: <CalendarIcon />, value: stats.closingThisWeek.toLocaleString(formatLocale), label: "Closing this week" },
    { icon: <ClockIcon />, value: stats.newIn48Hours.toLocaleString(formatLocale), label: "New in 48 hours" },
    {
      icon: <ShieldCheckIcon />,
      value: stats.underEvaluation.toLocaleString(formatLocale),
      label: "Under evaluation · Evaluation in progress",
    },
  ]

  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#faf7f2", borderTop: "1px solid #e8e0cc", borderBottom: "1px solid #e8e0cc" }}>
      <style dangerouslySetInnerHTML={{ __html: STAT_STYLES }} />
      <SkylineBackdrop />

      <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto", padding: "36px 24px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18, paddingBottom: 28 }}>
          <div style={{ maxWidth: 560 }}>
            <p className="newspaper-kicker" style={{ margin: "0 0 8px" }}>
              {t("trackedDaily")}
            </p>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: "#1a2e1a", margin: 0, lineHeight: 1.2 }}>
              {t("liveFeed")}
            </h2>
            <p className="font-serif" style={{ fontSize: 14, color: "#5a6a5a", marginTop: 8, lineHeight: 1.6 }}>
              {t("statsBody")}
            </p>
          </div>
          <Link
            href="/opportunities"
            className="osb-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 22px",
              borderRadius: 10,
              color: "#1a3a2a",
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 16px rgba(200,160,96,0.25)",
            }}
          >
            {t("browseAll")} &rarr;
          </Link>
        </div>

        <div className="osb-grid" style={{ borderTop: "1px solid #e8e0cc" }}>
          {items.map((item) => (
            <div key={item.label} className="osb-item" style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 20px" }}>
              <span
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#1a3a2a",
                  boxShadow: "0 2px 8px rgba(26,58,42,0.25)",
                }}
              >
                {item.icon}
              </span>
              <div>
                <p className="font-display" style={{ fontSize: 24, fontWeight: 800, color: "#1a2e1a", margin: 0, lineHeight: 1.1 }}>
                  {item.value}
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#5a6a5a", marginTop: 4 }}>
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
