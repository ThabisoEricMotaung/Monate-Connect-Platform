import Link from "next/link"

const INFO_STYLES = `
  .ic-grid {
    display: grid;
    grid-template-columns: 1fr 1px 1fr 1px 1fr;
  }
  .ic-divider {
    background: #d4c8a8;
    margin: 20px 0;
  }
  .ic-register-box {
    border: 1px solid #d4c8a8;
    border-radius: 4px;
    background: white;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: inherit;
    transition: border-color 200ms ease, background 200ms ease;
    cursor: pointer;
  }
  .ic-register-box:hover {
    border-color: #1a3a2a;
    background: #f8f4ec;
  }
  .ic-source-box {
    border: 1px solid #d4c8a8;
    border-radius: 4px;
    background: white;
    padding: 8px 6px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    transition: border-color 200ms ease, background 200ms ease;
  }
  .ic-source-box:hover {
    border-color: #1a3a2a;
    background: #f8f4ec;
  }
  @media (max-width: 767px) {
    .ic-grid { display: block; }
    .ic-divider { display: none; }
    .ic-card + .ic-card { border-top: 1px solid #d4c8a8; }
  }
`

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <h3 className="font-display" style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1a2e1a', margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ height: 2, background: 'linear-gradient(90deg, #c8a060, transparent)' }} aria-hidden="true" />
    </div>
  )
}

function CheckItem({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 10 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="7.5" cy="7.5" r="7.5" fill="#1D9E75" />
          <path d="M4.5 7.5l2.5 2.5 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-serif" style={{ fontSize: 12, lineHeight: 1.55, color: '#3a4a3a' }}>{text}</span>
    </li>
  )
}

export default function InfoCards() {
  return (
    <div style={{ background: '#f8f4ec', borderTop: '2px solid #1a3a2a', borderBottom: '2px solid #1a3a2a' }}>
      <style dangerouslySetInnerHTML={{ __html: INFO_STYLES }} />
      <div className="ic-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── CARD 1: FOR SUPPLIERS ── */}
        <div className="ic-card" style={{ padding: 28 }}>
          <CardHeader
            title="For Suppliers"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 10h16l-1.5-5h-13L4 10Z" />
                <path d="M5 10v9h14v-9M9 19v-5h6v5" />
              </svg>
            }
          />

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
            <CheckItem text="List your business. Upload your CSD number and BBBEE certificate." />
            <CheckItem text="Receive a SmartScore — your trust rating, visible to every buyer." />
            <CheckItem text="Matched RFQs come to you. No more missed closing dates." />
          </ul>

          <div style={{ background: '#1a3a2a', color: '#9FE1CB', padding: '5px 10px', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            SmartScore &middot; CSD &middot; BBBEE &middot; SARS
          </div>

          <Link href="/auth/signup" className="ic-register-box" style={{ textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a2e1a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Register Free</div>
              <div style={{ fontSize: 11, color: '#6a7a6a' }}>Verified in 48 hours. No credit card.</div>
            </div>
          </Link>
        </div>

        <div className="ic-divider" />

        {/* ── CARD 2: THE SMARTSCORE ── */}
        <div className="ic-card" style={{ padding: 28 }}>
          <CardHeader
            title="The SmartScore"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            }
          />

          <p className="font-serif" style={{ fontSize: 12, color: '#3a4a3a', lineHeight: 1.55, margin: '0 0 14px' }}>
            Every supplier carries a SmartScore — drawn from four official SA sources:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            {[
              {
                label: 'National Treasury CSD',
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6a5a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <path d="M9 22V12h6v10" />
                  </svg>
                ),
              },
              {
                label: 'SARS Tax Records',
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6a5a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="12" y2="17" />
                  </svg>
                ),
              },
              {
                label: 'CIPC Confirmation',
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6a5a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <circle cx="12" cy="15" r="3" />
                  </svg>
                ),
              },
              {
                label: 'Banking Confirmed',
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6a5a3a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                ),
              },
            ].map(({ label, icon }) => (
              <div key={label} className="ic-source-box">
                {icon}
                <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6a5a3a', lineHeight: 1.3 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          <p className="font-serif" style={{ fontSize: 12, color: '#3a4a3a', lineHeight: 1.55, margin: '0 0 14px' }}>
            Score 90 or above and your profile sits first in buyer searches.
          </p>

          <div style={{ background: '#f0ebe0', border: '1px solid #d4c8a8', borderRadius: 4, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c8a060" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="6" />
              <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
            </svg>
            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6a5a3a' }}>
              CSD &middot; BBBEE &middot; Tax cleared &middot; Banking confirmed
            </span>
          </div>
        </div>

        <div className="ic-divider" />

        {/* ── CARD 3: FOR BUYERS ── */}
        <div className="ic-card" style={{ padding: 28 }}>
          <CardHeader
            title="For Buyers"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            }
          />

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px' }}>
            <CheckItem text="Post an RFQ in five minutes. Set your BBBEE requirement, province, and value range." />
            <CheckItem text="Verified suppliers are notified immediately." />
            <CheckItem text="Compare quotes side by side — each carrying a SmartScore and verification badge." />
          </ul>

          <Link href="/auth/login?role=admin" className="ic-register-box" style={{ textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0ebe0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="2" width="16" height="20" rx="1" />
                <path d="M9 22V12h6v10" />
                <path d="M9 7h.01M12 7h.01M15 7h.01" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#1a2e1a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Request Access</div>
              <div style={{ fontSize: 11, color: '#6a7a6a' }}>For verified organisations. Municipalities welcome.</div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  )
}
