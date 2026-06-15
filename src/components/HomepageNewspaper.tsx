'use client'

import { useEffect, useState } from 'react'

const NP_STYLES = `
  .np-cols {
    display: grid;
    grid-template-columns: 1fr 1px 1.6fr 1px 1fr;
  }
  .np-col-divider { background: #1a1208; }
  .np-edition-center { }
  .np-cta-btn { transition: background 0.15s, color 0.15s; }
  .np-cta-btn:hover { background: #5DCAA5 !important; color: #1a3a2a !important; }
  @media (max-width: 767px) {
    .np-cols { display: block; }
    .np-col-divider { display: none; }
    .np-cta-bar { flex-direction: column !important; align-items: stretch !important; }
    .np-cta-btn { width: 100%; text-align: center; display: block !important; box-sizing: border-box; }
  }
  @media (max-width: 479px) {
    .np-edition-center { display: none; }
  }
`

export default function HomepageNewspaper() {
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const d = new Date()
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December',
    ]
    const n = d.getDate()
    const s = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'
    setDateStr(`${days[d.getDay()]}, ${n}${s} ${months[d.getMonth()]} ${d.getFullYear()}`)
  }, [])

  return (
    <div
      role="region"
      aria-label="Platform introduction"
      style={{ position: 'relative', overflow: 'hidden', background: '#f4efe0', color: '#1a1208' }}
    >
      <style dangerouslySetInnerHTML={{ __html: NP_STYLES }} />

      {/* LAYER 1 — BACKGROUND SVG SCENE */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 680 430" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {/* 1. WARM SKY */}
          <rect width="680" height="430" fill="#c8a060" opacity="0.4" />
          <rect width="680" height="200" fill="#e8c070" opacity="0.25" />

          {/* 2. SUN */}
          <circle cx="580" cy="55" r="50" fill="#d4901a" opacity="0.25" />
          <circle cx="580" cy="55" r="35" fill="#e8a020" opacity="0.2" />

          {/* 3. SKYLINE LEFT */}
          <g fill="#2a1a08" opacity="0.55">
            <rect x="0" y="180" width="32" height="150" />
            <rect x="16" y="158" width="22" height="172" />
            <rect x="34" y="192" width="26" height="138" />
            <rect x="54" y="168" width="20" height="162" />
            <rect x="68" y="185" width="28" height="145" />
            <rect x="90" y="155" width="24" height="175" />
            <rect x="108" y="198" width="18" height="132" />
            <rect x="120" y="174" width="22" height="156" />
            <rect x="18" y="150" width="14" height="10" rx="1" />
            <rect x="22" y="140" width="6" height="10" />
            <rect x="18" y="166" width="6" height="5" fill="#f4d070" opacity="0.7" />
            <rect x="28" y="166" width="6" height="5" fill="#f4d070" opacity="0.7" />
            <rect x="18" y="178" width="6" height="5" fill="#f4d070" opacity="0.5" />
            <rect x="28" y="178" width="6" height="5" fill="#f4d070" opacity="0.7" />
            <rect x="92" y="163" width="6" height="5" fill="#f4d070" opacity="0.6" />
            <rect x="102" y="163" width="6" height="5" fill="#f4d070" opacity="0.7" />
          </g>

          {/* 4. SKYLINE RIGHT */}
          <g fill="#2a1a08" opacity="0.55">
            <rect x="540" y="176" width="28" height="154" />
            <rect x="560" y="158" width="24" height="172" />
            <rect x="578" y="186" width="22" height="144" />
            <rect x="594" y="164" width="30" height="166" />
            <rect x="618" y="182" width="24" height="148" />
            <rect x="636" y="166" width="26" height="164" />
            <rect x="656" y="186" width="24" height="144" />
            <rect x="562" y="166" width="6" height="5" fill="#f4d070" opacity="0.7" />
            <rect x="572" y="166" width="6" height="5" fill="#f4d070" opacity="0.5" />
            <rect x="562" y="178" width="6" height="5" fill="#f4d070" opacity="0.7" />
            <rect x="596" y="172" width="6" height="5" fill="#f4d070" opacity="0.6" />
            <rect x="608" y="172" width="6" height="5" fill="#f4d070" opacity="0.7" />
          </g>

          {/* 5. GROUND */}
          <rect x="0" y="370" width="680" height="60" fill="#1a1008" opacity="0.3" />
          <line x1="0" y1="370" x2="680" y2="370" stroke="#2a1a08" strokeWidth="1.5" opacity="0.4" />

          {/* 6. ROAD MARKINGS */}
          <line x1="200" y1="390" x2="240" y2="390" stroke="#f4efe0" strokeWidth="2" opacity="0.2" />
          <line x1="280" y1="390" x2="320" y2="390" stroke="#f4efe0" strokeWidth="2" opacity="0.2" />
          <line x1="360" y1="390" x2="400" y2="390" stroke="#f4efe0" strokeWidth="2" opacity="0.2" />
          <line x1="440" y1="390" x2="480" y2="390" stroke="#f4efe0" strokeWidth="2" opacity="0.2" />

          {/* 7. MINIBUS TAXI */}
          <g fill="#1a1008" opacity="0.65">
            <rect x="190" y="336" width="110" height="36" rx="6" />
            <rect x="202" y="322" width="80" height="18" rx="5" />
            <rect x="206" y="326" width="14" height="10" rx="1" fill="#a0c8e0" opacity="0.5" />
            <rect x="224" y="326" width="14" height="10" rx="1" fill="#a0c8e0" opacity="0.5" />
            <rect x="242" y="326" width="14" height="10" rx="1" fill="#a0c8e0" opacity="0.5" />
            <rect x="260" y="326" width="14" height="10" rx="1" fill="#a0c8e0" opacity="0.5" />
            <rect x="196" y="340" width="16" height="12" rx="1" fill="#a0c8e0" opacity="0.4" />
            <rect x="216" y="340" width="16" height="12" rx="1" fill="#a0c8e0" opacity="0.4" />
            <rect x="236" y="340" width="16" height="12" rx="1" fill="#a0c8e0" opacity="0.4" />
            <rect x="256" y="340" width="16" height="12" rx="1" fill="#a0c8e0" opacity="0.4" />
            <rect x="276" y="340" width="16" height="12" rx="1" fill="#a0c8e0" opacity="0.4" />
            <circle cx="218" cy="374" r="10" />
            <circle cx="274" cy="374" r="10" />
            <circle cx="218" cy="374" r="5" fill="#3a2a18" />
            <circle cx="274" cy="374" r="5" fill="#3a2a18" />
            <rect x="190" y="352" width="110" height="5" fill="#1a3a2a" opacity="0.8" />
            <circle cx="298" cy="354" r="4" fill="#f4d070" opacity="0.7" />
            <rect x="206" y="319" width="72" height="4" rx="1" fill="#1a1008" />
          </g>

          {/* 8. ELECTRICITY POLE */}
          <g stroke="#1a1008" fill="none" opacity="0.45">
            <line x1="450" y1="195" x2="450" y2="372" strokeWidth="5" />
            <line x1="424" y1="220" x2="476" y2="220" strokeWidth="3" />
            <line x1="430" y1="230" x2="430" y2="248" strokeWidth="2" />
            <line x1="450" y1="230" x2="450" y2="248" strokeWidth="2" />
            <line x1="470" y1="230" x2="470" y2="248" strokeWidth="2" />
            <circle cx="430" cy="249" r="3" fill="#1a1008" />
            <circle cx="450" cy="249" r="3" fill="#1a1008" />
            <circle cx="470" cy="249" r="3" fill="#1a1008" />
            <path d="M430,249 Q340,262 210,258" strokeWidth="1.5" opacity="0.5" />
            <path d="M470,249 Q560,260 660,255" strokeWidth="1.5" opacity="0.5" />
          </g>

          {/* 9. MARKET STALL */}
          <g fill="#1a1008" opacity="0.55">
            <path d="M316,300 L386,300 L392,324 L310,324 Z" />
            <rect x="313" y="324" width="5" height="48" />
            <rect x="383" y="324" width="5" height="48" />
            <rect x="306" y="340" width="88" height="8" rx="2" />
            <circle cx="322" cy="337" r="7" />
            <circle cx="336" cy="336" r="6" />
            <circle cx="350" cy="337" r="7" />
            <circle cx="364" cy="336" r="6" />
            <circle cx="377" cy="337" r="6" />
            <ellipse cx="350" cy="284" rx="10" ry="11" />
            <rect x="342" y="295" width="16" height="28" rx="3" />
            <line x1="342" y1="298" x2="330" y2="314" stroke="#1a1008" strokeWidth="4" strokeLinecap="round" />
            <line x1="358" y1="298" x2="370" y2="308" stroke="#1a1008" strokeWidth="4" strokeLinecap="round" />
            <path d="M340,278 Q350,270 360,278 Q356,272 350,272 Q344,272 340,278 Z" />
          </g>

          {/* 10. WORKER 1 — construction hard hat */}
          <g fill="#1a1008" opacity="0.65">
            <ellipse cx="52" cy="300" rx="13" ry="15" />
            <path d="M38,292 Q52,278 66,292 Z" />
            <rect x="36" y="290" width="32" height="5" rx="2" />
            <rect x="43" y="315" width="18" height="38" rx="4" />
            <line x1="43" y1="320" x2="26" y2="344" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="61" y1="320" x2="78" y2="340" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="24" y1="342" x2="20" y2="368" stroke="#1a1008" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="18" cy="370" rx="6" ry="4" />
            <line x1="47" y1="353" x2="40" y2="375" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="57" y1="353" x2="64" y2="375" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="38" cy="376" rx="7" ry="4" />
            <ellipse cx="66" cy="376" rx="7" ry="4" />
          </g>

          {/* 11. WORKER 2 — office briefcase */}
          <g fill="#1a1008" opacity="0.62">
            <ellipse cx="110" cy="298" rx="13" ry="15" />
            <rect x="101" y="313" width="18" height="40" rx="4" />
            <rect x="108" y="313" width="4" height="18" fill="#2a1a08" opacity="0.5" />
            <line x1="101" y1="318" x2="86" y2="338" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="119" y1="318" x2="136" y2="334" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <rect x="132" y="330" width="18" height="14" rx="2" />
            <path d="M136,330 L136,325 L146,325 L146,330" fill="none" stroke="#1a1008" strokeWidth="2.5" />
            <line x1="104" y1="353" x2="96" y2="375" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="116" y1="353" x2="124" y2="375" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="93" cy="376" rx="7" ry="4" />
            <ellipse cx="126" cy="376" rx="7" ry="4" />
          </g>

          {/* 12. WORKER 3 — woman goods on head */}
          <g fill="#1a1008" opacity="0.60">
            <ellipse cx="162" cy="302" rx="12" ry="14" />
            <path d="M150,296 Q162,285 174,296 Q168,288 162,288 Q156,288 150,296 Z" />
            <rect x="148" y="283" width="28" height="10" rx="3" />
            <ellipse cx="162" cy="283" rx="16" ry="4" />
            <path d="M152,316 Q148,358 144,372 L180,372 Q176,358 172,316 Z" />
            <line x1="152" y1="322" x2="136" y2="340" stroke="#1a1008" strokeWidth="5" strokeLinecap="round" />
            <line x1="172" y1="322" x2="188" y2="340" stroke="#1a1008" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* 13. WORKER 4 — person on phone */}
          <g fill="#1a1008" opacity="0.62">
            <ellipse cx="508" cy="300" rx="13" ry="15" />
            <rect x="499" y="315" width="18" height="40" rx="4" />
            <line x1="499" y1="320" x2="484" y2="304" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <rect x="476" y="296" width="10" height="16" rx="2" />
            <line x1="517" y1="320" x2="532" y2="338" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="502" y1="355" x2="495" y2="375" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="514" y1="355" x2="521" y2="375" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="493" cy="376" rx="7" ry="4" />
            <ellipse cx="523" cy="376" rx="7" ry="4" />
          </g>

          {/* 14. WORKER 5 — delivery person with box */}
          <g fill="#1a1008" opacity="0.60">
            <ellipse cx="566" cy="296" rx="13" ry="15" />
            <rect x="557" y="311" width="18" height="40" rx="4" />
            <rect x="538" y="316" width="22" height="18" rx="2" />
            <line x1="548" y1="311" x2="542" y2="320" stroke="#1a1008" strokeWidth="5" strokeLinecap="round" />
            <line x1="566" y1="314" x2="560" y2="320" stroke="#1a1008" strokeWidth="4" strokeLinecap="round" />
            <line x1="575" y1="314" x2="590" y2="330" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="560" y1="351" x2="553" y2="374" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <line x1="572" y1="351" x2="579" y2="374" stroke="#1a1008" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="551" cy="375" rx="7" ry="4" />
            <ellipse cx="581" cy="375" rx="7" ry="4" />
          </g>

          {/* 15. WORKER 6 — woman headwrap handbag */}
          <g fill="#1a1008" opacity="0.58">
            <ellipse cx="624" cy="300" rx="12" ry="14" />
            <path d="M612,294 Q624,283 636,294 Q630,286 624,286 Q618,286 612,294 Z" />
            <path d="M614,314 Q610,356 606,372 L642,372 Q638,356 634,314 Z" />
            <line x1="634" y1="320" x2="650" y2="338" stroke="#1a1008" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="656" cy="344" rx="10" ry="8" />
            <path d="M649,338 Q656,330 663,338" fill="none" stroke="#1a1008" strokeWidth="2.5" />
            <line x1="614" y1="320" x2="600" y2="336" stroke="#1a1008" strokeWidth="5" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* LAYER 2 — PAPER OVERLAY */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: '#f4efe0', opacity: 0.55 }} />

      {/* LAYER 3 — NEWSPAPER CONTENT */}
      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* A) TORN TOP EDGE */}
        <svg width="100%" height="22" viewBox="0 0 680 22" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
          <path
            d="M0,0 L12,8 L24,2 L38,10 L52,3 L66,11 L80,4 L94,10 L108,2 L122,9 L136,2 L150,10 L164,3 L178,11 L192,4 L206,10 L220,2 L234,10 L248,3 L262,11 L276,4 L290,10 L304,2 L318,10 L332,3 L346,11 L360,4 L374,10 L388,2 L402,10 L416,3 L430,11 L444,4 L458,10 L472,2 L486,10 L500,3 L514,11 L528,4 L542,10 L556,2 L570,10 L584,3 L598,11 L612,4 L626,10 L640,2 L654,10 L668,4 L680,8 L680,22 L0,22 Z"
            fill="#f4efe0"
          />
        </svg>

        {/* B) MASTHEAD */}
        <div style={{ textAlign: 'center', padding: '14px 24px 10px', borderBottom: '3px double #1a1208' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a2e1a' }}>
            <span>Est. 2026 · Pretoria, Gauteng</span>
            <div style={{ flex: 1, height: '0.5px', background: '#1a1208', margin: '0 10px' }} aria-hidden="true" />
            <span>{dateStr}</span>
          </div>
          <div className="font-display" style={{ fontSize: 'clamp(32px, 6vw, 48px)', lineHeight: 1, color: '#1a1208', margin: '4px 0 2px' }}>
            AiForm Procure
          </div>
          <div style={{ fontSize: 14, color: '#5a4a2a', letterSpacing: '8px', margin: '2px 0' }}>
            — ✦ —
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#3a2e1a', marginTop: 4 }}>
            South Africa&#39;s Verified Procurement Network · Pilot Edition
          </div>
        </div>

        {/* C) EDITION BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 24px', borderBottom: '1px solid #1a1208', borderTop: '1px solid #1a1208', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a2e1a', background: 'rgba(237,232,212,0.85)' }}>
          <span>Vol. I · No. 1</span>
          <span className="np-edition-center">CSD · BBBEE · SARS · CIPC · National Treasury</span>
          <span>Free during pilot · Until Oct 2026</span>
        </div>

        {/* D) MAIN HEADLINE BLOCK */}
        <div style={{ padding: '16px 40px 12px', textAlign: 'center', borderBottom: '2px solid #1a1208', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ background: 'rgba(26, 58, 42, 0.88)', border: '1px solid #5DCAA5', padding: '14px 28px', maxWidth: 480, textAlign: 'center' }}>
            <h2 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 900, lineHeight: 1.1, color: '#E1F5EE', marginBottom: 8 }}>
              Where SA Suppliers<br /><em style={{ color: '#9FE1CB' }}>Meet Real Procurement.</em>
            </h2>
            <p className="font-display" style={{ fontStyle: 'italic', fontSize: 13, color: '#9FE1CB', lineHeight: 1.5, margin: 0 }}>
              Verified RFQs from Eskom, municipalities &amp; parastatals — matched to your BBBEE level and province.
            </p>
          </div>
          <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a4a2a', marginTop: 4 }}>
            — Procurement Correspondent · AiForm Procure Gazette
          </p>
        </div>

        {/* E) THREE COLUMN BODY */}
        <div className="np-cols" style={{ padding: '14px 0 8px' }}>

          {/* Column 1 */}
          <div style={{ padding: '12px 14px', background: 'rgba(244, 239, 224, 0.88)' }}>
            <h3 className="font-display" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #1a1208', paddingBottom: 4, marginBottom: 8, color: '#1a1208' }}>
              For suppliers
            </h3>
            <p className="font-serif" style={{ fontSize: 11, lineHeight: 1.65, color: '#1a1208', textAlign: 'justify', textShadow: '0 0 4px #f4efe0', margin: '0 0 6px' }}>
              List your business. Upload your CSD number and BBBEE certificate. Receive a SmartScore — your trust rating, visible to every buyer.
            </p>
            <p className="font-serif" style={{ fontSize: 11, lineHeight: 1.65, color: '#1a1208', textAlign: 'justify', textShadow: '0 0 4px #f4efe0', margin: 0 }}>
              Matched RFQs come to you. No more missed closing dates.
            </p>
            <div style={{ background: '#1a3a2a', color: '#9FE1CB', padding: '3px 10px', margin: '8px 0 0', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
              SmartScore · CSD · BBBEE · SARS
            </div>
            <div style={{ border: '1px solid #1a1208', padding: '7px 8px', textAlign: 'center', marginTop: 10, background: 'rgba(237,232,212,0.88)' }}>
              <p className="font-display" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1208', margin: '0 0 3px' }}>Register Free</p>
              <p className="font-serif" style={{ fontSize: 9, color: '#3a2e1a', margin: 0 }}>Verified in 48 hours.<br />No credit card required.</p>
            </div>
          </div>

          {/* Divider 1 */}
          <div className="np-col-divider" />

          {/* Column 2 */}
          <div style={{ padding: '12px 14px', background: 'rgba(244, 239, 224, 0.88)' }}>
            <h3 className="font-display" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #1a1208', paddingBottom: 4, marginBottom: 8, color: '#1a1208' }}>
              The SmartScore
            </h3>
            <p className="font-serif" style={{ fontSize: 11, lineHeight: 1.65, color: '#1a1208', textAlign: 'justify', textShadow: '0 0 4px #f4efe0', margin: '0 0 6px' }}>
              Every supplier carries a SmartScore — drawn from four official SA sources: National Treasury CSD, your BBBEE agency, SARS tax records, and CIPC banking confirmation.
            </p>
            <p className="font-serif" style={{ fontSize: 11, lineHeight: 1.65, color: '#1a1208', textAlign: 'justify', textShadow: '0 0 4px #f4efe0', margin: 0 }}>
              Score 90 or above and your profile sits first in buyer searches. Complete your profile in under ten minutes.
            </p>
            <div style={{ borderTop: '1px solid #c8b89a', margin: '8px 0 5px', paddingTop: 5, fontSize: 9, color: '#5a4a2a', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CSD · BBBEE · Tax cleared · Banking confirmed
            </div>
          </div>

          {/* Divider 2 */}
          <div className="np-col-divider" />

          {/* Column 3 */}
          <div style={{ padding: '12px 14px', background: 'rgba(244, 239, 224, 0.88)' }}>
            <h3 className="font-display" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #1a1208', paddingBottom: 4, marginBottom: 8, color: '#1a1208' }}>
              For buyers
            </h3>
            <p className="font-serif" style={{ fontSize: 11, lineHeight: 1.65, color: '#1a1208', textAlign: 'justify', textShadow: '0 0 4px #f4efe0', margin: '0 0 6px' }}>
              Post an RFQ in five minutes. Set your BBBEE requirement, province, and value range. Verified suppliers are notified immediately.
            </p>
            <p className="font-serif" style={{ fontSize: 11, lineHeight: 1.65, color: '#1a1208', textAlign: 'justify', textShadow: '0 0 4px #f4efe0', margin: 0 }}>
              Compare quotes side by side — each carrying a SmartScore and verification badge.
            </p>
            <div style={{ border: '1px solid #1a1208', padding: '7px 8px', textAlign: 'center', marginTop: 10, background: 'rgba(237,232,212,0.88)' }}>
              <p className="font-display" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1208', margin: '0 0 3px' }}>Request Access</p>
              <p className="font-serif" style={{ fontSize: 9, color: '#3a2e1a', margin: 0 }}>For verified organisations.<br />Municipalities welcome.</p>
            </div>
          </div>

        </div>

        {/* F) CTA BAR */}
        <div className="np-cta-bar" style={{ background: '#1a3a2a', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <p className="font-display" style={{ fontStyle: 'italic', fontSize: 12, color: '#9FE1CB', flex: 1, textAlign: 'left', margin: 0 }}>
            The procurement network South Africa has been waiting for.
          </p>
          <a
            href="/auth/signup"
            className="np-cta-btn"
            style={{ border: '1px solid #5DCAA5', color: '#E1F5EE', padding: '5px 14px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Register as supplier →
          </a>
          <a
            href="/auth/login?role=admin"
            className="np-cta-btn"
            style={{ border: '1px solid #5DCAA5', color: '#E1F5EE', padding: '5px 14px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Buyer access →
          </a>
        </div>

        {/* G) TORN BOTTOM EDGE */}
        <svg width="100%" height="22" viewBox="0 0 680 22" preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
          <path
            d="M0,18 L12,9 L24,16 L38,7 L52,14 L66,5 L80,12 L94,3 L108,10 L122,1 L136,8 L150,16 L164,5 L178,12 L192,3 L206,10 L220,1 L234,8 L248,16 L262,5 L276,12 L290,3 L304,10 L318,1 L332,8 L346,16 L360,5 L374,12 L388,3 L402,10 L416,1 L430,8 L444,16 L458,5 L472,12 L486,3 L500,10 L514,1 L528,8 L542,16 L556,5 L570,12 L584,3 L598,10 L612,1 L626,8 L640,16 L654,5 L668,12 L680,8 L680,22 L0,22 Z"
            fill="#f4efe0"
          />
        </svg>

      </div>
    </div>
  )
}
