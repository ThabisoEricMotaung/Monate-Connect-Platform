"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

type RFQWireRow = {
  id: number;
  title: string | null;
  buyer_org: string | null;
  industry: string | null;
};

const COLLAPSED_HEIGHT = "24px";
const LS_KEY = "ticker-collapsed";

const updates: TickerUpdate[] = [
  {
    category: "Mining",
    icon: "MIN",
    text: "Mining procurement update: New maintenance RFQs available in Mpumalanga",
    tone: "mining",
    url: "https://www.miningweekly.com",
  },
  {
    category: "Eskom",
    icon: "ESK",
    text: "Eskom supplier notice: Local contractors encouraged to keep profiles updated",
    tone: "eskom",
    url: "https://www.eskom.co.za",
  },
  {
    category: "Infrastructure",
    icon: "INF",
    text: "Infrastructure opportunity: Water and sanitation RFQs closing soon",
    tone: "infrastructure",
    url: "https://www.infrastructure.gov.za",
  },
  {
    category: "Supplier Advert",
    icon: "ADV",
    text: "Supplier advert: Verified suppliers get priority visibility",
    tone: "advert",
    url: "/dashboard/profile",
  },
  {
    category: "Compliance",
    icon: "CSD",
    text: "Compliance reminder: Keep CSD, BBBEE and tax details updated",
    tone: "compliance",
    url: "https://secure.csd.gov.za",
  },
  {
    category: "RFQ Deadline",
    icon: "RFQ",
    text: "RFQ deadline: Submit quotes before closing windows lapse",
    tone: "deadline",
    url: "/dashboard/rfqs",
  },
];

function truncateTitle(value: string | null): string {
  const title = (value ?? "Untitled RFQ").trim();
  return title.length > 50 ? `${title.slice(0, 47)}...` : title;
}

function industryIcon(industry: string | null): string {
  const normalized = (industry ?? "").toLowerCase();
  if (normalized.includes("water")) return "WAT";
  if (normalized.includes("energy")) return "ENE";
  if (normalized.includes("health")) return "HLT";
  if (normalized.includes("construction")) return "CON";
  if (normalized.includes("ict")) return "ICT";
  if (normalized.includes("logistics")) return "LOG";
  return "RFQ";
}

function tickerTone(industry: string | null): TickerTone {
  const normalized = (industry ?? "").toLowerCase();
  if (normalized.includes("energy")) return "eskom";
  if (normalized.includes("construction") || normalized.includes("water")) return "infrastructure";
  if (normalized.includes("mining")) return "mining";
  return "deadline";
}

function mapRFQToTicker(row: RFQWireRow): TickerUpdate {
  const industry = row.industry || "RFQ";
  const buyer = row.buyer_org || "Procurement buyer";

  return {
    category: industry,
    icon: industryIcon(industry),
    text: `${buyer} — ${truncateTitle(row.title)}`,
    tone: tickerTone(industry),
    url: `/dashboard/rfqs/${row.id}`,
  };
}

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
  const [liveUpdates, setLiveUpdates] = useState<TickerUpdate[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (window.sessionStorage.getItem("monate-news-ticker-dismissed") === "1") {
      document.documentElement.style.setProperty("--news-ticker-height", "0px");
      setDismissed(true);
      return;
    }

    const isCollapsed = window.localStorage.getItem(LS_KEY) === "1";
    if (isCollapsed) {
      setCollapsed(true);
      document.documentElement.style.setProperty("--news-ticker-height", COLLAPSED_HEIGHT);
    } else {
      document.documentElement.style.removeProperty("--news-ticker-height");
    }

    async function loadLatestRFQs() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("rfqs")
        .select("id,title,buyer_org,industry,published_date,created_at")
        .ilike("status", "open")
        .eq("is_public", true)
        .order("published_date", { ascending: false, nullsFirst: false })
        .limit(3);

      if (cancelled || error || !data || data.length === 0) return;
      setLiveUpdates((data as RFQWireRow[]).map(mapRFQToTicker));
    }

    loadLatestRFQs();

    return () => {
      cancelled = true;
    };
  }, []);

  function dismissTicker() {
    window.sessionStorage.setItem("monate-news-ticker-dismissed", "1");
    document.documentElement.style.setProperty("--news-ticker-height", "0px");
    setDismissed(true);
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(LS_KEY, next ? "1" : "0");
    if (next) {
      document.documentElement.style.setProperty("--news-ticker-height", COLLAPSED_HEIGHT);
    } else {
      document.documentElement.style.removeProperty("--news-ticker-height");
    }
  }

  if (dismissed) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        className="news-ticker-tab"
        onClick={toggleCollapsed}
        aria-label="Expand procurement wire"
      >
        Procurement Wire ∨
      </button>
    );
  }

  const sourceItems = liveUpdates?.length ? liveUpdates : updates;
  const tickerItems = [...sourceItems, ...sourceItems];

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
      <button
        type="button"
        className="news-ticker__collapse"
        onClick={toggleCollapsed}
        aria-label="Collapse procurement wire"
      >
        ∧
      </button>
      <button
        type="button"
        className="news-ticker__dismiss"
        onClick={dismissTicker}
        aria-label="Dismiss procurement wire"
      >
        ×
      </button>
    </aside>
  );
}
