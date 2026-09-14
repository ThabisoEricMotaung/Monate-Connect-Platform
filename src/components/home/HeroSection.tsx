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
          <filter id="blur1"><feGaussianBlur stdDeviation="0.6" /></filter>
          <filter id="blur2"><feGaussianBlur stdDeviation="1.2" /></filter>
          <filter id="blur3"><feGaussianBlur stdDeviation="0.4" /></filter>
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

      {/* ── Main content ── */}
      <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "56px 40px 64px" }}>

        {/* Headline */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 11, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#1a3a2a", margin: "0 0 14px", fontWeight: 800, padding: "6px 14px", border: "1.5px solid #c8a060", borderRadius: "30px", background: "rgba(200,160,96,0.15)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#173D2B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              {/* Classical government building with columns */}
              {/* Pediment/roof */}
              <path d="M 3 14 L 12 5 L 21 14" />
              {/* Main structure */}
              <rect x="4" y="14" width="16" height="8" />
              {/* Left colonnade */}
              <line x1="6" y1="14" x2="6" y2="22" />
              <line x1="8" y1="14" x2="8" y2="22" />
              {/* Center door */}
              <rect x="11" y="16" width="2" height="6" />
              {/* Right colonnade */}
              <line x1="16" y1="14" x2="16" y2="22" />
              <line x1="18" y1="14" x2="18" y2="22" />
            </svg>
            <span>South African Procurement Opportunities</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 900, lineHeight: 1.08, color: "#173D2B", margin: 0, fontStyle: "normal" }}>
            Discover Verified Suppliers &amp;
          </h1>
          <div style={{ display: "inline-block", marginBottom: 20 }}>
            <span style={{ fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 700, fontStyle: "normal", color: "#173D2B" }}>
              Government Procurement Opportunities
            </span>
            <div aria-hidden="true" style={{ height: 3, background: "linear-gradient(90deg, transparent, #c8a060 20%, #c8a060 80%, transparent)", marginTop: 6 }} />
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "#3a4a3a", maxWidth: 480, margin: "0 0 18px" }}>
            Browse automatically screened public tenders and RFQs by industry, province and closing date—with links to original sources.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a8a7a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
            </svg>
            <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a8a7a" }}>
              &mdash; PUBLIC OPPORTUNITIES SOURCED FROM OFFICIAL PROCUREMENT LISTINGS.
            </span>
          </div>


      </div>
    </div>
  )
}
