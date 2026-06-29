"use client"

import Link from "next/link"

const HERO_STYLES = `
  .hero-root {
    position: relative;
    overflow: hidden;
    background: #f0ebe0;
    min-height: 360px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .hero-content {
    position: relative;
    z-index: 2;
    padding: 56px 24px 64px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 40px;
    align-items: center;
  }
  .hero-h1 {
    font-size: clamp(28px, 4.5vw, 52px);
    font-weight: 900;
    line-height: 1.08;
    color: #1a2e1a;
    margin: 0;
  }
  .hero-h1-italic {
    font-size: clamp(28px, 4.5vw, 52px);
    font-weight: 700;
    font-style: italic;
    color: #1a3a2a;
  }
  .hero-deck {
    font-size: 16px;
    line-height: 1.6;
    color: #3a4a3a;
    max-width: 480px;
    margin: 18px 0 0;
  }
  .hero-panel {
    background: #1a3a2a;
    border-radius: 8px;
    padding: 24px;
    color: #f8f4ec;
  }
  @media (max-width: 900px) {
    .hero-content { grid-template-columns: 1fr; }
    .hero-panel { display: none; }
  }
  @media (max-width: 768px) {
    .hero-root { min-height: 280px; }
    .hero-content { padding: 40px 20px 48px; }
    .hero-deck { font-size: 14px; }
  }
`

export default function HeroSection() {
  return (
    <div className="hero-root">
      <style dangerouslySetInnerHTML={{ __html: HERO_STYLES }} />

      {/* SA city skyline SVG */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <svg width="100%" height="100%" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="1200" height="320" fill="#e8e0cc" />
          <rect width="1200" height="180" fill="#dfd4b8" opacity="0.4" />
          <rect x="0" y="200" width="28" height="80" fill="#b0a898" opacity="0.62" />
          <rect x="25" y="180" width="34" height="100" fill="#a8a090" opacity="0.65" />
          <rect x="56" y="158" width="38" height="122" fill="#9a9080" opacity="0.65" />
          <rect x="91" y="140" width="32" height="140" fill="#9a9080" opacity="0.66" />
          <rect x="120" y="118" width="44" height="162" fill="#8a8070" opacity="0.68" />
          <rect x="161" y="98" width="38" height="182" fill="#8a8070" opacity="0.68" />
          <rect x="196" y="82" width="46" height="198" fill="#7a7060" opacity="0.7" />
          <rect x="240" y="44" width="64" height="236" fill="#706860" opacity="0.72" />
          <rect x="256" y="55" width="32" height="180" fill="#7a7260" opacity="0.3" />
          <rect x="308" y="136" width="36" height="144" fill="#8a8070" opacity="0.68" />
          <rect x="320" y="62" width="12" height="76" fill="#8a8070" opacity="0.7" />
          <ellipse cx="326" cy="56" rx="18" ry="10" fill="#9a9080" opacity="0.7" />
          <line x1="326" y1="24" x2="326" y2="48" stroke="#9a9080" strokeWidth="3" opacity="0.7" />
          <rect x="349" y="155" width="40" height="125" fill="#9a9080" opacity="0.65" />
          <rect x="387" y="172" width="30" height="108" fill="#a8a090" opacity="0.62" />
          <rect x="837" y="155" width="40" height="125" fill="#9a9080" opacity="0.65" />
          <rect x="874" y="135" width="42" height="145" fill="#9a9080" opacity="0.66" />
          <rect x="913" y="112" width="46" height="168" fill="#8a8070" opacity="0.68" />
          <rect x="956" y="96" width="38" height="184" fill="#8a8070" opacity="0.68" />
          <rect x="991" y="118" width="36" height="162" fill="#9a9080" opacity="0.66" />
          <rect x="1030" y="72" width="20" height="208" fill="#706860" opacity="0.72" />
          <rect x="1106" y="72" width="20" height="208" fill="#706860" opacity="0.72" />
          <line x1="1040" y1="76" x2="1000" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <line x1="1040" y1="76" x2="1060" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <line x1="1116" y1="76" x2="1080" y2="278" stroke="#9a9080" strokeWidth="1" opacity="0.4" />
          <line x1="1116" y1="76" x2="1136" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <rect x="990" y="274" width="176" height="6" fill="#9a9080" opacity="0.45" />
          <rect x="0" y="278" width="1200" height="42" fill="#8a8070" opacity="0.28" />
          <ellipse cx="455" cy="275" rx="32" ry="19" fill="#7a8a6a" opacity="0.42" />
          <ellipse cx="508" cy="278" rx="22" ry="14" fill="#6a7a5a" opacity="0.38" />
          <ellipse cx="558" cy="276" rx="28" ry="17" fill="#7a8a6a" opacity="0.42" />
          <ellipse cx="650" cy="276" rx="30" ry="18" fill="#7a8a6a" opacity="0.4" />
          <ellipse cx="710" cy="278" rx="24" ry="14" fill="#6a7a5a" opacity="0.38" />
          <ellipse cx="758" cy="276" rx="26" ry="16" fill="#7a8a6a" opacity="0.42" />
        </svg>
      </div>

      {/* Gradient overlay */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: "linear-gradient(to bottom, rgba(240,235,224,0.2) 0%, rgba(240,235,224,0.5) 50%, rgba(240,235,224,0.95) 100%)" }} />

      {/* Hero content */}
      <div className="hero-content">
        {/* Left — text */}
        <div>
          <p style={{ display: "inline-block", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#c8a060", margin: "0 0 14px", fontWeight: 800, padding: "5px 16px", border: "0.5px solid rgba(200,160,96,0.6)", borderRadius: "30px", background: "rgba(200,160,96,0.06)" }}>
            South Africa&#39;s Verified Procurement Network
          </p>
          <h1 className="hero-h1 font-display">Where SA Suppliers</h1>
          <div style={{ display: "inline-block", marginBottom: 20 }}>
            <span className="hero-h1-italic font-display">Meet Real Procurement.</span>
            <div aria-hidden="true" style={{ height: 3, background: "linear-gradient(90deg, transparent, #c8a060 20%, #c8a060 80%, transparent)", marginTop: 6 }} />
          </div>
          <p className="hero-deck font-serif">
            Verified RFQs from Eskom, municipalities &amp; parastatals &mdash; matched to your BBBEE level and province.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 18 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8a7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a8a7a" }}>
              &mdash; Procurement Correspondent &middot; AiForm Procure Gazette
            </span>
          </div>
        </div>

        {/* Right — dark procurement hub panel */}
        <div className="hero-panel">
          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5DCAA5", marginBottom: 12, fontWeight: 700 }}>
            AiForm Procure
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f8f4ec", margin: "0 0 16px", lineHeight: 1.2 }}>
            Your procurement hub
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "For Suppliers", body: "Find opportunities. Get verified. Grow your business.", href: "/auth/signup" },
              { label: "The SmartScore", body: "Built from verified government and banking data.", href: "/trust" },
              { label: "For Buyers", body: "Source verified suppliers. Post RFQs. Manage quotes.", href: "/contact" },
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px 14px", textDecoration: "none", transition: "background 200ms ease" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#f8f4ec", margin: "0 0 2px" }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: "rgba(248,244,236,0.6)", margin: 0, lineHeight: 1.4 }}>{item.body}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(200,160,96,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
          <Link href="/auth/signup" style={{ display: "block", marginTop: 16, background: "#c8a060", color: "#1a3a2a", textAlign: "center", padding: "10px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textDecoration: "none" }}>
            Explore the platform &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
