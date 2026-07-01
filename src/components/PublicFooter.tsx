"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, type CSSProperties } from "react"

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "About", href: "/about" },
      { label: "Opportunities", href: "/opportunities" },
      { label: "Supplier Marketplace", href: "/suppliers" },
      { label: "Trust Centre", href: "/trust" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Data Protection", href: "/data-protection" },
    ],
  },
]

const footerVars = {
  "--procure-green": "#123c2b",
  "--procure-green-soft": "#1f5a41",
  "--procure-gold": "#c9a13b",
  "--procure-ivory": "#f8f3e7",
  "--procure-border": "rgba(18, 60, 43, 0.14)",
} as CSSProperties

const trustChips = [
  "Trusted information",
  "Verified network",
  "Transparent procurement",
  "Better outcomes for SA",
]

const complianceBadges = [
  "CSD Verified",
  "BBBEE Compliant",
  "SARS Compliant",
  "POPIA Aware",
]

const sectionIconPaths: Record<string, { tone: string; path: string }> = {
  Platform: {
    tone: "footer-icon-green",
    path: "M3.75 5.25a1.5 1.5 0 011.5-1.5h4.5v6h-6v-4.5zm10.5-1.5h4.5a1.5 1.5 0 011.5 1.5v4.5h-6v-6zm-10.5 10.5h6v6h-4.5a1.5 1.5 0 01-1.5-1.5v-4.5zm10.5 0h6v4.5a1.5 1.5 0 01-1.5 1.5h-4.5v-6z",
  },
  Support: {
    tone: "footer-icon-teal",
    path: "M4.5 12a7.5 7.5 0 0115 0v4.5a2.25 2.25 0 01-2.25 2.25H15m-10.5-3h2.25A2.25 2.25 0 009 13.5v-1.125A2.25 2.25 0 006.75 10.125H4.5v5.625zm15 0h-2.25A2.25 2.25 0 0115 13.5v-1.125a2.25 2.25 0 012.25-2.25H19.5v5.625zM15 18.75a3 3 0 01-6 0",
  },
  Legal: {
    tone: "footer-icon-gold",
    path: "M12 3v18m-6.75-9h13.5M8.25 7.5L4.5 12.75h7.5L8.25 7.5zm7.5 0L12 12.75h7.5L15.75 7.5zM7.5 18.75h9",
  },
}

const linkIconPaths: Record<string, string> = {
  About: "M3.75 21h16.5M4.5 21V8.25L12 3l7.5 5.25V21m-10.5 0v-6h6v6",
  Opportunities: "M9.75 6.75V5.25A2.25 2.25 0 0112 3h0a2.25 2.25 0 012.25 2.25v1.5m-9 0h13.5A1.5 1.5 0 0120.25 8.25v9.75a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5zm5.25 5.25h3",
  "Supplier Marketplace": "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0M19.5 8.25a2.25 2.25 0 110 4.5M4.5 8.25a2.25 2.25 0 100 4.5",
  "Trust Centre": "M12 21s7.5-3.75 7.5-10.5V5.25L12 2.25 4.5 5.25v5.25C4.5 17.25 12 21 12 21zm-3-9l2 2 4-4",
  Pricing: "M3.75 7.5V5.25A1.5 1.5 0 015.25 3.75h2.25l12.75 12.75-3.75 3.75L3.75 7.5zm3-.75h.008",
  "Help Centre": "M12 21a8.25 8.25 0 100-16.5 8.25 8.25 0 000 16.5zm0-3v-1.5m0-9a2.625 2.625 0 012.625 2.625c0 1.875-2.625 2.25-2.625 4.125",
  Contact: "M3.75 6.75h16.5v10.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V6.75zm0 0L12 12.75l8.25-6",
  Privacy: "M12 21s7.5-3.75 7.5-10.5V5.25L12 2.25 4.5 5.25v5.25C4.5 17.25 12 21 12 21zm-2.25-8.25L11.25 14.25 15 10.5",
  Terms: "M6.75 3.75h7.5L18 7.5v12.75H6.75V3.75zm7.5 0V7.5H18M9 11.25h6M9 14.25h6M9 17.25h3",
  "Cookie Policy": "M12 21a9 9 0 01-8.98-8.38A4.5 4.5 0 007.5 8.25 4.5 4.5 0 0012.75 3 9 9 0 1112 21zm-3-4.5h.008M15 15h.008M12 9.75h.008",
  "Data Protection": "M8.25 10.5V7.5a3.75 3.75 0 017.5 0v3m-9 0h10.5a1.5 1.5 0 011.5 1.5v6.75a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5V12a1.5 1.5 0 011.5-1.5z",
}

function SvgIcon({ path, className = "h-4 w-4" }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function FooterSkyline() {
  return (
    <svg className="footer-skyline" aria-hidden="true" viewBox="0 0 1400 360" preserveAspectRatio="xMidYMax slice">
      <g className="footer-network" fill="none" stroke="#8a6a30" strokeDasharray="4 8" strokeWidth="1.2">
        <circle cx="150" cy="70" r="4" fill="#8a6a30" />
        <circle cx="360" cy="115" r="3" fill="#8a6a30" />
        <circle cx="590" cy="65" r="4" fill="#8a6a30" />
        <circle cx="870" cy="120" r="3" fill="#8a6a30" />
        <circle cx="1130" cy="80" r="4" fill="#8a6a30" />
        <circle cx="1280" cy="140" r="3" fill="#8a6a30" />
        <path d="M150 70Q250 120 360 115T590 65Q720 65 870 120T1130 80Q1210 110 1280 140" />
      </g>
      <g opacity="0.05" fill="#123c2b">
        <rect x="100" y="142" width="22" height="170" />
        <rect x="124" y="118" width="34" height="194" />
        <rect x="160" y="92" width="26" height="220" />
        <rect x="190" y="134" width="38" height="178" />
        <rect x="245" y="55" width="58" height="257" />
        <rect x="260" y="70" width="28" height="206" fill="#f8f3e7" opacity="0.35" />
        <rect x="345" y="118" width="34" height="194" />
        <rect x="385" y="82" width="44" height="230" />
        <rect x="432" y="144" width="30" height="168" />
        <rect x="980" y="132" width="30" height="180" />
        <rect x="1012" y="104" width="42" height="208" />
        <rect x="1058" y="142" width="28" height="170" />
      </g>
      <g opacity="0.055" fill="#1f5a41">
        <rect x="520" y="175" width="72" height="137" />
        <ellipse cx="556" cy="174" rx="39" ry="20" />
        <rect x="610" y="132" width="42" height="180" />
        <rect x="655" y="150" width="34" height="162" />
        <rect x="692" y="120" width="46" height="192" />
        <polygon points="765,312 775,145 785,312" />
        <line x1="752" y1="205" x2="805" y2="205" stroke="#1f5a41" strokeWidth="3" />
        <polygon points="820,312 830,156 840,312" />
        <line x1="808" y1="218" x2="858" y2="218" stroke="#1f5a41" strokeWidth="3" />
      </g>
      <g opacity="0.06" fill="#123c2b" stroke="#123c2b" strokeLinecap="round">
        <rect x="850" y="218" width="8" height="94" />
        <rect x="832" y="218" width="52" height="6" />
        <rect x="920" y="236" width="8" height="76" />
        <rect x="902" y="236" width="52" height="6" />
        <rect x="1080" y="238" width="125" height="74" />
        <polygon points="1080,238 1142,207 1205,238" />
        <rect x="1228" y="174" width="5" height="138" />
        <line x1="1230.5" y1="174" x2="1206" y2="132" strokeWidth="4" />
        <line x1="1230.5" y1="174" x2="1256" y2="132" strokeWidth="4" />
        <line x1="1230.5" y1="174" x2="1230.5" y2="126" strokeWidth="4" />
        <line x1="0" y1="308" x2="1400" y2="308" strokeWidth="3" />
        <line x1="0" y1="318" x2="1400" y2="318" strokeWidth="2" />
        {[0, 56, 112, 168, 224, 280, 336, 392, 448, 504, 560, 616, 672, 728, 784, 840, 896, 952, 1008, 1064, 1120, 1176, 1232, 1288, 1344].map((x) => (
          <line key={x} x1={x} y1="305" x2={x + 28} y2="320" strokeWidth="2" />
        ))}
      </g>
      <g opacity="0.045" fill="#6b7d57">
        <ellipse cx="160" cy="334" rx="240" ry="42" />
        <ellipse cx="690" cy="342" rx="360" ry="44" />
        <ellipse cx="1230" cy="336" rx="290" ry="46" />
      </g>
    </svg>
  )
}

function CardPattern() {
  return (
    <svg className="footer-card-pattern" aria-hidden="true" viewBox="0 0 260 90" preserveAspectRatio="none">
      <path d="M0 64C42 42 72 84 120 60S198 20 260 48" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M0 80C52 58 88 96 142 72S205 46 260 68" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M0 38H260M0 58H260M36 20V90M92 12V90M148 16V90M204 12V90" fill="none" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  )
}

export default function PublicFooter() {
  const [socialNotice, setSocialNotice] = useState("")

  function openAccessibility() {
    window.dispatchEvent(new Event("monate:open-accessibility"))
  }

  function showSocialComingSoon(platform: string) {
    setSocialNotice(`${platform} coming soon`)
    window.setTimeout(() => setSocialNotice(""), 2000)
  }

  return (
    <footer className="public-footer relative overflow-hidden border-t border-[#123c2b]/10 bg-[#f8f3e7] text-[#123c2b]" style={footerVars}>
      <FooterSkyline />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.85fr_1.35fr] lg:py-14">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.24em] text-[#1a3a2a]">
            AIFORM PROCURE
          </p>
          <div className="mt-3 h-0.5 w-16 rounded-full bg-[#c8a060]" />
          <h2 className="mt-5 font-display text-4xl font-bold leading-tight text-[#123c2b] md:text-5xl">
            Public procurement intelligence, clearly{" "}
            <span className="italic text-[#c8a060]">signposted</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#123c2b]/70">
            Public information for suppliers, buyers, pilot partners and procurement stakeholders.
            Legal and policy pages contain professional placeholder language and are not final legal
            advice.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {trustChips.map((chip, index) => (
              <span key={chip} className="footer-trust-chip">
                <span className={index % 2 === 0 ? "footer-chip-icon footer-chip-icon-green" : "footer-chip-icon footer-chip-icon-gold"}>
                  <SvgIcon path="M9 12.75l2 2 4-4" className="h-3.5 w-3.5" />
                </span>
                {chip}
              </span>
            ))}
          </div>
        </div>

        <nav className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Public footer navigation">
          {footerSections.map((section) => {
            const sectionIcon = sectionIconPaths[section.title]

            return (
              <div key={section.title} className="footer-nav-card group">
                <CardPattern />
                <span className={`footer-section-icon ${sectionIcon.tone}`}>
                  <SvgIcon path={sectionIcon.path} className="h-5 w-5" />
                </span>
                <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.22em] text-[#123c2b]">
                  {section.title}
                </p>
                <div className="mt-2 h-0.5 w-10 rounded-full bg-[#c8a060]" />
                <div className="relative z-10 mt-5 grid gap-2.5">
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href} className="footer-nav-link">
                      <span className="footer-link-icon">
                        <SvgIcon path={linkIconPaths[link.label]} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">{link.label}</span>
                      <svg className="footer-link-arrow h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl border-t border-[#123c2b]/10 px-6 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(260px,0.8fr)_1fr] lg:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-sm font-semibold text-[#123c2b]/70">
              &copy; 2026 AiForm Procure &middot; Procurement Suite
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#123c2b]/70">
              <Image
                src="/aiform-mark.png"
                alt=""
                width={19}
                height={24}
                className="h-6 w-auto"
              />
              <span>A product of AiForm Studio</span>
            </div>
          </div>

          <div className="footer-wire-wrap">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c8a060]/40" />
            <Link href="/opportunities" className="footer-wire-pill">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.25-5.25l-2.12 2.12M8.87 15.13l-2.12 2.12m10.5 0l-2.12-2.12M8.87 8.87L6.75 6.75M9.75 12a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" />
              </svg>
              <span>AIFORMS PROCUREMENT WIRE</span>
            </Link>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c8a060]/40" />
          </div>

          <div className="relative flex items-center gap-2 lg:justify-end">
            {socialNotice && (
              <span className="absolute -top-8 right-0 whitespace-nowrap rounded-full border border-[#123c2b]/12 bg-white/80 px-3 py-1 text-xs font-bold text-[#123c2b] shadow-sm">
                {socialNotice}
              </span>
            )}
            <button type="button" onClick={() => showSocialComingSoon("LinkedIn")} className="footer-social-button" aria-label="LinkedIn" title="Coming soon">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.5 8.75H3.25v11H6.5v-11zM4.88 7.25a1.88 1.88 0 100-3.76 1.88 1.88 0 000 3.76zM20.75 13.41c0-2.95-1.57-4.91-4.13-4.91a3.56 3.56 0 00-3.21 1.77V8.75h-3.12v11h3.25v-5.44c0-1.44.27-2.83 2.05-2.83 1.76 0 1.78 1.64 1.78 2.92v5.35h3.25l.13-6.34z" />
              </svg>
            </button>
            <button type="button" onClick={() => showSocialComingSoon("Facebook")} className="footer-social-button" aria-label="Facebook" title="Coming soon">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14.2 21v-7.3h2.45l.37-2.84H14.2V9.05c0-.82.23-1.38 1.41-1.38h1.5V5.13A20.03 20.03 0 0014.92 5c-2.16 0-3.64 1.32-3.64 3.74v2.12H8.84v2.84h2.44V21h2.92z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openAccessibility}
              className="footer-social-button footer-access-button"
              aria-label="Accessibility"
            >
              <svg className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4.5 7.5h15M12 7.5v13.5m-4.5 0L12 12l4.5 9" />
              </svg>
              <span className="hidden sm:inline">Accessibility</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {complianceBadges.map((badge, index) => (
            <span key={badge} className="footer-compliance-chip">
              <span className={index % 2 === 0 ? "footer-chip-icon footer-chip-icon-green" : "footer-chip-icon footer-chip-icon-gold"}>
                <SvgIcon path={index === 3 ? linkIconPaths.Privacy : "M9 12.75l2 2 4-4"} className="h-3.5 w-3.5" />
              </span>
              {badge}
              <span className="footer-check-dot">
                <SvgIcon path="M8.5 12.5l2 2 5-5" className="h-3 w-3" />
              </span>
            </span>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .footer-skyline {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          width: 100%;
          height: 58%;
          pointer-events: none;
        }

        .footer-network {
          opacity: 0.03;
          animation: footerNetworkShimmer 18s ease-in-out infinite;
        }

        .footer-trust-chip,
        .footer-compliance-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid var(--procure-border);
          background: rgba(255, 255, 255, 0.56);
          border-radius: 999px;
          padding: 0.45rem 0.75rem;
          color: rgba(18, 60, 43, 0.78);
          font-size: 0.78rem;
          font-weight: 700;
          box-shadow: 0 10px 26px rgba(18, 60, 43, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
        }

        .footer-chip-icon,
        .footer-check-dot {
          display: inline-flex;
          width: 1.35rem;
          height: 1.35rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
        }

        .footer-chip-icon-green {
          background: rgba(31, 90, 65, 0.1);
          color: var(--procure-green);
        }

        .footer-chip-icon-gold {
          background: rgba(201, 161, 59, 0.13);
          color: var(--procure-gold);
        }

        .footer-check-dot {
          width: 1.1rem;
          height: 1.1rem;
          background: rgba(31, 90, 65, 0.12);
          color: var(--procure-green-soft);
        }

        .footer-nav-card {
          position: relative;
          overflow: hidden;
          min-height: 100%;
          border: 1px solid rgba(18, 60, 43, 0.1);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.6);
          padding: 1.25rem;
          box-shadow:
            0 20px 45px rgba(18, 60, 43, 0.09),
            0 4px 14px rgba(18, 60, 43, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.78),
            inset 0 0 38px rgba(201, 161, 59, 0.06);
          backdrop-filter: blur(12px);
          transition: transform 280ms ease, box-shadow 280ms ease, border-color 280ms ease;
        }

        .footer-nav-card:hover {
          transform: translateY(-4px);
          border-color: rgba(201, 161, 59, 0.28);
          box-shadow:
            0 28px 60px rgba(18, 60, 43, 0.14),
            0 8px 18px rgba(18, 60, 43, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 0 46px rgba(201, 161, 59, 0.1);
        }

        .footer-section-icon {
          display: inline-flex;
          width: 2.75rem;
          height: 2.75rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), 0 10px 22px rgba(18, 60, 43, 0.08);
        }

        .footer-icon-green {
          background: rgba(31, 90, 65, 0.11);
          color: var(--procure-green);
        }

        .footer-icon-teal {
          background: rgba(46, 148, 139, 0.12);
          color: #176b61;
        }

        .footer-icon-gold {
          background: rgba(201, 161, 59, 0.16);
          color: var(--procure-gold);
        }

        .footer-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          border-radius: 14px;
          padding: 0.6rem 0.65rem;
          color: rgba(18, 60, 43, 0.76);
          font-size: 0.93rem;
          font-weight: 700;
          transition: background-color 240ms ease, color 240ms ease, transform 240ms ease;
        }

        .footer-nav-link:hover {
          background: rgba(248, 243, 231, 0.72);
          color: var(--procure-green);
          transform: translateX(2px);
        }

        .footer-link-icon {
          display: inline-flex;
          width: 1.85rem;
          height: 1.85rem;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(18, 60, 43, 0.07);
          color: var(--procure-green-soft);
        }

        .footer-link-arrow {
          flex: 0 0 auto;
          color: var(--procure-gold);
          transition: transform 240ms ease;
        }

        .footer-nav-link:hover .footer-link-arrow {
          transform: translateX(3px);
        }

        .footer-card-pattern {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          height: 34%;
          color: rgba(18, 60, 43, 0.055);
          pointer-events: none;
        }

        .footer-wire-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          min-width: 0;
        }

        .footer-wire-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          white-space: nowrap;
          border: 1px solid rgba(201, 161, 59, 0.35);
          border-radius: 999px;
          background: var(--procure-green);
          padding: 0.72rem 1rem;
          color: var(--procure-gold);
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
          transition: transform 240ms ease, box-shadow 240ms ease;
        }

        .footer-wire-pill::before,
        .footer-wire-pill::after {
          content: none;
        }

        .footer-wire-pill:hover {
          transform: translateY(-2px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 0 4px rgba(201, 161, 59, 0.08);
        }

        .footer-social-button {
          display: inline-flex;
          min-width: 2.5rem;
          height: 2.5rem;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border: 1px solid rgba(18, 60, 43, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.42);
          padding-inline: 0.75rem;
          color: var(--procure-green);
          font-size: 0.8rem;
          font-weight: 800;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
          transition: transform 220ms ease, border-color 220ms ease, color 220ms ease, background-color 220ms ease;
        }

        .footer-social-button:hover {
          transform: translateY(-2px);
          border-color: rgba(201, 161, 59, 0.34);
          background: rgba(255, 255, 255, 0.68);
          color: var(--procure-gold);
        }

        .footer-access-button {
          cursor: pointer;
        }

        @keyframes footerNetworkShimmer {
          0%, 100% {
            opacity: 0.025;
          }
          50% {
            opacity: 0.04;
          }
        }

        @media (max-width: 640px) {
          .footer-skyline {
            opacity: 0.45;
          }

          .footer-wire-wrap {
            justify-content: flex-start;
          }

          .footer-wire-wrap > span {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .footer-network,
          .footer-nav-card,
          .footer-nav-link,
          .footer-link-arrow,
          .footer-wire-pill,
          .footer-social-button {
            animation: none;
            transition: none;
          }

          .footer-nav-card:hover,
          .footer-nav-link:hover,
          .footer-wire-pill:hover,
          .footer-social-button:hover {
            transform: none;
          }
        }
      `}</style>
    </footer>
  )
}
