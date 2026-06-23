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
    text-align: center;
    padding: 56px 24px 64px;
    max-width: 680px;
    margin: 0 auto;
    width: 100%;
  }
  .hero-h1 {
    font-size: clamp(28px, 5vw, 52px);
    font-weight: 900;
    line-height: 1.08;
    color: #1a2e1a;
    margin: 0;
  }
  .hero-h1-italic {
    font-size: clamp(28px, 5vw, 52px);
    font-weight: 700;
    font-style: italic;
    color: #1a3a2a;
  }
  .hero-deck {
    font-size: 17px;
    line-height: 1.6;
    color: #3a4a3a;
    max-width: 480px;
    margin: 18px auto 0;
  }
  @media (max-width: 768px) {
    .hero-root { min-height: 280px; }
    .hero-content { padding: 40px 20px 48px; }
    .hero-deck { font-size: 15px; }
  }
`

export default function HeroSection() {
  return (
    <div className="hero-root">
      <style dangerouslySetInnerHTML={{ __html: HERO_STYLES }} />

      {/* LAYER 0 — SA city skyline SVG */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1200 320"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Sky */}
          <rect width="1200" height="320" fill="#e8e0cc" />
          <rect width="1200" height="180" fill="#dfd4b8" opacity="0.4" />

          {/* === LEFT CLUSTER === */}
          {/* Background/mid-ground buildings */}
          <rect x="0" y="200" width="28" height="80" fill="#b0a898" opacity="0.62" />
          <rect x="25" y="180" width="34" height="100" fill="#a8a090" opacity="0.65" />
          <rect x="56" y="158" width="38" height="122" fill="#9a9080" opacity="0.65" />
          <rect x="91" y="140" width="32" height="140" fill="#9a9080" opacity="0.66" />
          <rect x="120" y="118" width="44" height="162" fill="#8a8070" opacity="0.68" />
          <rect x="161" y="98" width="38" height="182" fill="#8a8070" opacity="0.68" />
          <rect x="196" y="82" width="46" height="198" fill="#7a7060" opacity="0.7" />

          {/* Ponte Tower — distinctive tall slab */}
          <rect x="240" y="44" width="64" height="236" fill="#706860" opacity="0.72" />
          {/* Ponte hollow suggestion (lighter inner band) */}
          <rect x="256" y="55" width="32" height="180" fill="#7a7260" opacity="0.3" />
          {/* Ponte windows */}
          <rect x="248" y="60" width="7" height="6" fill="#e8dcb8" opacity="0.65" />
          <rect x="261" y="60" width="7" height="6" fill="#e8dcb8" opacity="0.7" />
          <rect x="274" y="60" width="7" height="6" fill="#e8dcb8" opacity="0.55" />
          <rect x="287" y="60" width="7" height="6" fill="#e8dcb8" opacity="0.65" />
          <rect x="248" y="74" width="7" height="6" fill="#e8dcb8" opacity="0.7" />
          <rect x="261" y="74" width="7" height="6" fill="#e8dcb8" opacity="0.45" />
          <rect x="274" y="74" width="7" height="6" fill="#e8dcb8" opacity="0.7" />
          <rect x="287" y="74" width="7" height="6" fill="#e8dcb8" opacity="0.55" />
          <rect x="248" y="88" width="7" height="6" fill="#e8dcb8" opacity="0.5" />
          <rect x="274" y="88" width="7" height="6" fill="#e8dcb8" opacity="0.65" />
          <rect x="261" y="88" width="7" height="6" fill="#e8dcb8" opacity="0.6" />

          {/* Hillbrow Tower — base + disc + needle */}
          <rect x="308" y="136" width="36" height="144" fill="#8a8070" opacity="0.68" />
          <rect x="320" y="62" width="12" height="76" fill="#8a8070" opacity="0.7" />
          <ellipse cx="326" cy="56" rx="18" ry="10" fill="#9a9080" opacity="0.7" />
          <ellipse cx="326" cy="56" rx="6" ry="4" fill="#b0a898" opacity="0.65" />
          <line x1="326" y1="24" x2="326" y2="48" stroke="#9a9080" strokeWidth="3" opacity="0.7" />

          {/* Windows on tall buildings */}
          <rect x="165" y="110" width="6" height="5" fill="#e8dcb8" opacity="0.65" />
          <rect x="176" y="110" width="6" height="5" fill="#e8dcb8" opacity="0.7" />
          <rect x="187" y="110" width="6" height="5" fill="#e8dcb8" opacity="0.5" />
          <rect x="165" y="124" width="6" height="5" fill="#e8dcb8" opacity="0.7" />
          <rect x="176" y="124" width="6" height="5" fill="#e8dcb8" opacity="0.5" />
          <rect x="130" y="130" width="5" height="5" fill="#e8dcb8" opacity="0.6" />
          <rect x="141" y="130" width="5" height="5" fill="#e8dcb8" opacity="0.65" />
          <rect x="152" y="130" width="5" height="5" fill="#e8dcb8" opacity="0.5" />

          {/* More buildings — right of left cluster */}
          <rect x="349" y="155" width="40" height="125" fill="#9a9080" opacity="0.65" />
          <rect x="387" y="172" width="30" height="108" fill="#a8a090" opacity="0.62" />
          <rect x="414" y="185" width="26" height="95" fill="#b0a898" opacity="0.58" />
          <rect x="437" y="198" width="22" height="82" fill="#b8b0a0" opacity="0.5" />

          {/* === RIGHT CLUSTER === */}
          <rect x="760" y="202" width="24" height="78" fill="#b8b0a0" opacity="0.5" />
          <rect x="782" y="188" width="28" height="92" fill="#b0a898" opacity="0.58" />
          <rect x="808" y="172" width="32" height="108" fill="#a8a090" opacity="0.62" />
          <rect x="837" y="155" width="40" height="125" fill="#9a9080" opacity="0.65" />
          <rect x="874" y="135" width="42" height="145" fill="#9a9080" opacity="0.66" />
          <rect x="913" y="112" width="46" height="168" fill="#8a8070" opacity="0.68" />
          <rect x="956" y="96" width="38" height="184" fill="#8a8070" opacity="0.68" />
          <rect x="991" y="118" width="36" height="162" fill="#9a9080" opacity="0.66" />

          {/* Windows — right cluster */}
          <rect x="916" y="126" width="6" height="5" fill="#e8dcb8" opacity="0.65" />
          <rect x="928" y="126" width="6" height="5" fill="#e8dcb8" opacity="0.7" />
          <rect x="940" y="126" width="6" height="5" fill="#e8dcb8" opacity="0.5" />
          <rect x="916" y="140" width="6" height="5" fill="#e8dcb8" opacity="0.7" />
          <rect x="928" y="140" width="6" height="5" fill="#e8dcb8" opacity="0.5" />
          <rect x="960" y="110" width="6" height="5" fill="#e8dcb8" opacity="0.65" />
          <rect x="972" y="110" width="6" height="5" fill="#e8dcb8" opacity="0.7" />
          <rect x="960" y="124" width="6" height="5" fill="#e8dcb8" opacity="0.55" />

          {/* Cable-stayed bridge towers */}
          <rect x="1030" y="72" width="20" height="208" fill="#706860" opacity="0.72" />
          <rect x="1106" y="72" width="20" height="208" fill="#706860" opacity="0.72" />
          {/* Bridge top caps */}
          <rect x="1026" y="68" width="28" height="8" fill="#807870" opacity="0.7" />
          <rect x="1102" y="68" width="28" height="8" fill="#807870" opacity="0.7" />
          {/* Cable lines */}
          <line x1="1040" y1="76" x2="1000" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <line x1="1040" y1="76" x2="1020" y2="278" stroke="#9a9080" strokeWidth="1" opacity="0.4" />
          <line x1="1040" y1="76" x2="1060" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <line x1="1040" y1="76" x2="1080" y2="278" stroke="#9a9080" strokeWidth="1" opacity="0.4" />
          <line x1="1116" y1="76" x2="1080" y2="278" stroke="#9a9080" strokeWidth="1" opacity="0.4" />
          <line x1="1116" y1="76" x2="1100" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <line x1="1116" y1="76" x2="1136" y2="278" stroke="#9a9080" strokeWidth="1.5" opacity="0.5" />
          <line x1="1116" y1="76" x2="1156" y2="278" stroke="#9a9080" strokeWidth="1" opacity="0.4" />
          {/* Bridge road deck */}
          <rect x="990" y="274" width="176" height="6" fill="#9a9080" opacity="0.45" />

          {/* More buildings right of bridge */}
          <rect x="1132" y="155" width="36" height="125" fill="#9a9080" opacity="0.64" />
          <rect x="1165" y="170" width="30" height="110" fill="#a8a090" opacity="0.6" />

          {/* Ground */}
          <rect x="0" y="278" width="1200" height="42" fill="#8a8070" opacity="0.28" />
          <line x1="0" y1="278" x2="1200" y2="278" stroke="#9a9080" strokeWidth="1" opacity="0.35" />

          {/* Foreground trees */}
          <ellipse cx="455" cy="275" rx="32" ry="19" fill="#7a8a6a" opacity="0.42" />
          <ellipse cx="508" cy="278" rx="22" ry="14" fill="#6a7a5a" opacity="0.38" />
          <ellipse cx="558" cy="276" rx="28" ry="17" fill="#7a8a6a" opacity="0.42" />
          <ellipse cx="618" cy="278" rx="18" ry="12" fill="#6a7a5a" opacity="0.36" />
          <ellipse cx="650" cy="276" rx="30" ry="18" fill="#7a8a6a" opacity="0.4" />
          <ellipse cx="710" cy="278" rx="24" ry="14" fill="#6a7a5a" opacity="0.38" />
          <ellipse cx="758" cy="276" rx="26" ry="16" fill="#7a8a6a" opacity="0.42" />
        </svg>
      </div>

      {/* LAYER 1 — gradient overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(240,235,224,0.2) 0%, rgba(240,235,224,0.5) 50%, rgba(240,235,224,0.95) 100%)',
        }}
      />

      {/* LAYER 2 — hero text */}
      <div className="hero-content">
        {/* Eyebrow */}
        <p style={{ display: 'inline-block', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c8a060', margin: '0 0 14px', fontWeight: 800, opacity: 1, textShadow: '0 0 12px rgba(192,57,43,0.6), 0 0 24px rgba(192,57,43,0.3)', background: 'rgba(192,57,43,0.08)', padding: '3px 10px' }}>
          South Africa&#39;s Verified Procurement Network
        </p>

        {/* Heading line 1 */}
        <h1 className="hero-h1 font-display">
          Where SA Suppliers
        </h1>

        {/* Heading line 2 — italic + gold underline */}
        <div style={{ display: 'inline-block', marginBottom: 20 }}>
          <span className="hero-h1-italic font-display">
            Meet Real Procurement.
          </span>
          <div
            aria-hidden="true"
            style={{
              height: 3,
              background: 'linear-gradient(90deg, transparent, #c8a060 20%, #c8a060 80%, transparent)',
              marginTop: 6,
            }}
          />
        </div>

        {/* Deck */}
        <p className="hero-deck font-serif">
          Verified RFQs from Eskom, municipalities &amp; parastatals — matched to your BBBEE level and province.
        </p>

        {/* Byline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8a7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a8a7a' }}>
            — Procurement Correspondent &middot; AiForm Procure Gazette
          </span>
        </div>
      </div>
    </div>
  )
}
