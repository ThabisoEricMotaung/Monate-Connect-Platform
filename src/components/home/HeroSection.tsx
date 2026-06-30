"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

export default function HeroSection() {
  const layer1Ref = useRef<SVGGElement>(null)
  const layer2Ref = useRef<SVGGElement>(null)
  const layer3Ref = useRef<SVGGElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      if (layer1Ref.current) layer1Ref.current.style.transform = `translateY(${y * 0.02}px)`
      if (layer2Ref.current) layer2Ref.current.style.transform = `translateY(${y * 0.04}px)`
      if (layer3Ref.current) layer3Ref.current.style.transform = `translateY(${y * 0.06}px)`
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!mq.matches) window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#f0ebe0", minHeight: 420, display: "flex", alignItems: "center" }}>

      {/* ── LAYER 0: sunrise warm gradient ── */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, background: "radial-gradient(ellipse 80% 60% at 10% 60%, rgba(200,160,96,0.10) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 0% 50%, rgba(220,180,100,0.08) 0%, transparent 60%)" }} />

      {/* ── LAYER 1-4: SA skyline SVG ── */}
      <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }} viewBox="0 0 1400 480" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0ebe0" stopOpacity="0" />
            <stop offset="100%" stopColor="#f0ebe0" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="warmLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8a060" stopOpacity="0.12" />
            <stop offset="40%" stopColor="#c8a060" stopOpacity="0" />
          </linearGradient>
          <filter id="blur1"><feGaussianBlur stdDeviation="3" /></filter>
          <filter id="blur2"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="blur3"><feGaussianBlur stdDeviation="1.5" /></filter>
        </defs>

        {/* Layer 1 — very distant, extremely faded (3-4% opacity) */}
        <g ref={layer1Ref} opacity="0.16" filter="url(#blur2)" fill="#5a6a50">
          {/* Distant CBD mass */}
          <rect x="100" y="280" width="20" height="140" />
          <rect x="118" y="260" width="28" height="160" />
          <rect x="144" y="240" width="24" height="180" />
          <rect x="166" y="220" width="32" height="200" />
          <rect x="196" y="200" width="26" height="220" />
          <rect x="220" y="185" width="36" height="235" />
          {/* Ponte Tower silhouette */}
          <rect x="255" y="120" width="55" height="300" />
          <rect x="268" y="130" width="29" height="250" fill="#f0ebe0" opacity="0.4" />
          {/* Hillbrow tower */}
          <rect x="315" y="190" width="28" height="230" />
          <rect x="325" y="120" width="8" height="72" />
          <ellipse cx="329" cy="115" rx="14" ry="8" />
          {/* More distant towers */}
          <rect x="350" y="210" width="22" height="210" />
          <rect x="370" y="225" width="18" height="195" />
          <rect x="700" y="230" width="30" height="200" />
          <rect x="728" y="210" width="24" height="220" />
          <rect x="750" y="195" width="32" height="235" />
          <rect x="780" y="175" width="28" height="255" />
          {/* Cape Town distant */}
          <rect x="1050" y="240" width="22" height="190" />
          <rect x="1070" y="220" width="30" height="210" />
          <rect x="1098" y="200" width="26" height="230" />
          <rect x="1122" y="215" width="20" height="215" />
          {/* Signal Hill suggestion */}
          <ellipse cx="1200" cy="380" rx="120" ry="60" />
          <ellipse cx="1320" cy="390" rx="100" ry="50" />
        </g>

        {/* Layer 2 — office towers, government buildings (5-6% opacity) */}
        <g opacity="0.22" filter="url(#blur1)" fill="#4a6040">
          {/* The Leonardo */}
          <rect x="420" y="140" width="42" height="300" />
          <rect x="424" y="140" width="34" height="280" fill="#4a6040" />
          <rect x="430" y="145" width="8" height="260" fill="#f0ebe0" opacity="0.15" />
          {/* Sandton cluster */}
          <rect x="465" y="175" width="36" height="265" />
          <rect x="499" y="160" width="30" height="280" />
          <rect x="527" y="185" width="24" height="255" />
          <rect x="549" y="170" width="32" height="270" />
          {/* Union Buildings dome (very subtle) */}
          <rect x="590" y="280" width="60" height="150" />
          <ellipse cx="620" cy="278" rx="32" ry="18" />
          <rect x="596" y="260" width="12" height="22" />
          <rect x="632" y="260" width="12" height="22" />
          {/* Durban towers */}
          <rect x="850" y="200" width="28" height="240" />
          <rect x="876" y="185" width="36" height="255" />
          <rect x="910" y="205" width="24" height="235" />
          <rect x="932" y="195" width="30" height="245" />
          {/* Power pylon */}
          <polygon points="970,420 978,240 986,420" />
          <polygon points="974,320 990,300 1006,320 990,310" />
          <line x1="960" y1="300" x2="1010" y2="300" stroke="#4a6040" strokeWidth="2" />
          <polygon points="1010,420 1018,250 1026,420" />
          <polygon points="1014,330 1030,310 1046,330 1030,320" />
          <line x1="1000" y1="310" x2="1050" y2="310" stroke="#4a6040" strokeWidth="2" />
        </g>

        {/* Layer 3 — logistics infrastructure (5% opacity) */}
        <g opacity="0.20" filter="url(#blur3)" fill="#3a5535">
          {/* Harbour cranes — Durban */}
          <rect x="800" y="300" width="8" height="140" />
          <rect x="790" y="300" width="28" height="6" />
          <rect x="790" y="306" width="4" height="80" />
          <rect x="818" y="306" width="4" height="60" />
          <rect x="820" y="300" width="8" height="140" />
          <rect x="810" y="300" width="28" height="6" />
          <rect x="840" y="300" width="8" height="140" />
          <rect x="830" y="300" width="28" height="6" />
          {/* Shipping containers */}
          <rect x="760" y="390" width="30" height="18" rx="1" />
          <rect x="793" y="390" width="30" height="18" rx="1" />
          <rect x="826" y="390" width="30" height="18" rx="1" />
          <rect x="760" y="374" width="30" height="18" rx="1" fill="#4a6a3a" />
          <rect x="793" y="374" width="30" height="18" rx="1" fill="#3a5030" />
          {/* Modern warehouse */}
          <rect x="1100" y="350" width="120" height="80" />
          <polygon points="1100,350 1160,320 1220,350" />
          <rect x="1110" y="360" width="20" height="40" fill="#f0ebe0" opacity="0.2" />
          <rect x="1145" y="360" width="20" height="40" fill="#f0ebe0" opacity="0.2" />
          <rect x="1180" y="360" width="20" height="40" fill="#f0ebe0" opacity="0.2" />
          {/* Wind turbines */}
          <rect x="1280" y="280" width="4" height="160" />
          <line x1="1282" y1="280" x2="1260" y2="240" stroke="#3a5535" strokeWidth="3" />
          <line x1="1282" y1="280" x2="1304" y2="240" stroke="#3a5535" strokeWidth="3" />
          <line x1="1282" y1="280" x2="1282" y2="232" stroke="#3a5535" strokeWidth="3" />
          <rect x="1330" y="300" width="4" height="140" />
          <line x1="1332" y1="300" x2="1312" y2="262" stroke="#3a5535" strokeWidth="3" />
          <line x1="1332" y1="300" x2="1352" y2="262" stroke="#3a5535" strokeWidth="3" />
          <line x1="1332" y1="300" x2="1332" y2="254" stroke="#3a5535" strokeWidth="3" />
          {/* Rail lines */}
          <line x1="0" y1="430" x2="1400" y2="430" stroke="#3a5535" strokeWidth="2" />
          <line x1="0" y1="436" x2="1400" y2="436" stroke="#3a5535" strokeWidth="2" />
          {[0,40,80,120,160,200,240,280,320,360,400,440,480,520,560,600,640,680,720,760,800,840,880,920,960,1000,1040,1080,1120,1160,1200,1240,1280,1320,1360].map((x) => (
            <line key={x} x1={x} y1="428" x2={x+20} y2="438" stroke="#3a5535" strokeWidth="1.5" />
          ))}
          {/* Solar farm suggestion */}
          <rect x="50" y="390" width="12" height="8" rx="1" />
          <rect x="66" y="390" width="12" height="8" rx="1" />
          <rect x="82" y="390" width="12" height="8" rx="1" />
          <rect x="50" y="402" width="12" height="8" rx="1" />
          <rect x="66" y="402" width="12" height="8" rx="1" />
          <rect x="82" y="402" width="12" height="8" rx="1" />
        </g>

        {/* Layer 4 — foreground terrain */}
        <g opacity="0.14" fill="#6a7a5a">
          <ellipse cx="200" cy="460" rx="200" ry="50" />
          <ellipse cx="700" cy="470" rx="300" ry="40" />
          <ellipse cx="1200" cy="465" rx="250" ry="45" />
        </g>

        {/* Procurement network overlay — nodes and connections */}
        <g opacity="0.035" stroke="#8a6a30" fill="none">
          <circle cx="300" cy="200" r="3" fill="#8a6a30" />
          <circle cx="500" cy="150" r="2" fill="#8a6a30" />
          <circle cx="650" cy="220" r="3" fill="#8a6a30" />
          <circle cx="900" cy="180" r="2" fill="#8a6a30" />
          <circle cx="1100" cy="210" r="3" fill="#8a6a30" />
          <circle cx="1300" cy="170" r="2" fill="#8a6a30" />
          <path d="M300,200 Q400,140 500,150" strokeWidth="1" strokeDasharray="4,6" />
          <path d="M500,150 Q575,185 650,220" strokeWidth="1" strokeDasharray="4,6" />
          <path d="M650,220 Q775,200 900,180" strokeWidth="1" strokeDasharray="4,6" />
          <path d="M900,180 Q1000,195 1100,210" strokeWidth="1" strokeDasharray="4,6" />
          <path d="M1100,210 Q1200,190 1300,170" strokeWidth="1" strokeDasharray="4,6" />
          <circle cx="420" cy="300" r="2" fill="#8a6a30" />
          <circle cx="750" cy="280" r="2" fill="#8a6a30" />
          <circle cx="1050" cy="320" r="2" fill="#8a6a30" />
          <path d="M420,300 Q585,290 750,280" strokeWidth="0.8" strokeDasharray="3,8" />
          <path d="M750,280 Q900,300 1050,320" strokeWidth="0.8" strokeDasharray="3,8" />
        </g>

        {/* Warm left sunrise overlay */}
        <rect x="0" y="0" width="1400" height="480" fill="url(#warmLeft)" />

        {/* Bottom fade to cream */}
        <rect x="0" y="0" width="1400" height="480" fill="url(#skyFade)" />
      </svg>

      {/* ── Ambient glow particles ── */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "30%", left: "8%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,160,96,0.06) 0%, transparent 70%)", animation: "glowDrift 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "20%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(93,202,165,0.04) 0%, transparent 70%)", animation: "glowDrift 18s ease-in-out infinite reverse" }} />
      </div>

      <style>{`
        @keyframes glowDrift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(12px, -8px); }
          66% { transform: translate(-8px, 10px); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: scale(0.96); filter: blur(8px); }
          to { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shineSwipe {
          from { background-position: -200% center; }
          to { background-position: 200% center; }
        }
        .hero-glass-panel {
          animation: panelIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }
        .hero-glass-card {
          animation: cardIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
          transition: transform 300ms ease, box-shadow 300ms ease;
        }
        .hero-glass-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(26,58,42,0.12), 0 0 0 1px rgba(255,255,255,0.3);
        }
        .hero-gold-btn {
          background: linear-gradient(135deg, #d4a843 0%, #c8a060 40%, #e0b870 70%, #c8a060 100%);
          background-size: 200% auto;
          transition: transform 280ms ease, box-shadow 280ms ease, background-position 600ms ease;
        }
        .hero-gold-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(200,160,96,0.35);
          background-position: right center;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-glass-panel, .hero-glass-card { animation: none; }
          .hero-gold-btn { transition: none; }
        }
      `}</style>

      {/* ── Main content grid ── */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "56px 24px 64px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 48, alignItems: "center" }}>

        {/* Left — headline */}
        <div>
          <p style={{ display: "inline-block", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#1a3a2a", margin: "0 0 14px", fontWeight: 800, padding: "5px 16px", border: "1.5px solid #c8a060", borderRadius: "30px", background: "rgba(200,160,96,0.15)" }}>
            South Africa&#39;s Verified Procurement Network
          </p>
          <h1 style={{ fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 900, lineHeight: 1.08, color: "#1a2e1a", margin: 0 }}>
            Where SA Suppliers
          </h1>
          <div style={{ display: "inline-block", marginBottom: 20 }}>
            <span style={{ fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 700, fontStyle: "italic", color: "#1a3a2a" }}>
              Meet Real Procurement.
            </span>
            <div aria-hidden="true" style={{ height: 3, background: "linear-gradient(90deg, transparent, #c8a060 20%, #c8a060 80%, transparent)", marginTop: 6 }} />
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#3a4a3a", maxWidth: 480, margin: "0 0 18px" }}>
            Verified RFQs from Eskom, municipalities &amp; parastatals &mdash; matched to your BBBEE level and province.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8a7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
            </svg>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a8a7a" }}>
              &mdash; Procurement Correspondent &middot; AiForm Procure Gazette
            </span>
          </div>
        </div>

        {/* Right — liquid glass panel */}
        <div className="hero-glass-panel" style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          background: "linear-gradient(145deg, rgba(255,255,255,0.72) 0%, rgba(240,235,224,0.58) 50%, rgba(220,235,225,0.52) 100%)",
          border: "1px solid rgba(255,255,255,0.55)",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 40px rgba(26,58,42,0.10), 0 2px 8px rgba(26,58,42,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Inner highlight */}
          <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0.9) 70%, transparent)" }} />

          <p style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5DCAA5", marginBottom: 8, fontWeight: 700 }}>
            AiForm Procure
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a2e1a", margin: "0 0 16px", lineHeight: 1.2 }}>
            Your procurement hub
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "For Suppliers", body: "Find opportunities. Get verified. Grow your business.", href: "/auth/signup", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z", delay: "0.1s" },
              { label: "The SmartScore", body: "Built from verified government and banking data.", href: "/trust", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z", delay: "0.18s" },
              { label: "For Buyers", body: "Source verified suppliers. Post RFQs. Manage quotes.", href: "/contact", icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z", delay: "0.26s" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="hero-glass-card" style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.50)",
                border: "1px solid rgba(255,255,255,0.60)",
                borderRadius: 14,
                padding: "12px 14px",
                textDecoration: "none",
                animationDelay: item.delay,
                boxShadow: "0 2px 8px rgba(26,58,42,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
              }}>
                <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "rgba(26,58,42,0.10)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(93,202,165,0.15)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={item.icon} />
                  </svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a2e1a", margin: "0 0 2px" }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: "#5a6a5a", margin: 0, lineHeight: 1.4 }}>{item.body}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8a060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          <Link href="/auth/signup" className="hero-gold-btn" style={{ display: "block", marginTop: 14, color: "#1a3a2a", textAlign: "center", padding: "11px 16px", borderRadius: 10, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none", boxShadow: "0 4px 16px rgba(200,160,96,0.25), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
            Explore the platform &rarr;
          </Link>
        </div>
      </div>

      {/* Responsive collapse */}
      <style>{`
        @media (max-width: 900px) {
          .hero-glass-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
