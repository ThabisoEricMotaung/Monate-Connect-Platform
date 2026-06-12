const TRUST_STYLES = `
  .ts-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }
  .ts-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 18px 20px;
  }
  .ts-item + .ts-item {
    border-left: 1px solid #d4c8a8;
  }
  @media (max-width: 767px) {
    .ts-grid { grid-template-columns: 1fr 1fr; }
    .ts-item:nth-child(3) { border-left: none; }
    .ts-item:nth-child(3), .ts-item:nth-child(4) { border-top: 1px solid #d4c8a8; }
  }
  @media (max-width: 400px) {
    .ts-grid { grid-template-columns: 1fr; }
    .ts-item + .ts-item { border-left: none; border-top: 1px solid #d4c8a8; }
  }
`

const TRUST_ITEMS = [
  {
    title: 'Government-Grade Verification',
    subtitle: 'CSD, SARS, CIPC, and banking — all cross-checked before any supplier appears.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'BBBEE-Targeted Matching',
    subtitle: 'Every RFQ is matched to the correct BBBEE level, sector, and province.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <path d="M12 12l3 3" />
        <circle cx="12" cy="12" r="1" fill="#1D9E75" />
      </svg>
    ),
  },
  {
    title: 'Live RFQ Notifications',
    subtitle: 'Suppliers are alerted within minutes of a matching RFQ being posted.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    title: 'Audit-Ready Records',
    subtitle: 'Every quote, award, and transaction logged and exportable for procurement audits.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
]

export default function TrustStrip() {
  return (
    <div style={{ background: '#f0ebe0', borderTop: '1px solid #d4c8a8' }}>
      <style dangerouslySetInnerHTML={{ __html: TRUST_STYLES }} />
      <div className="ts-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="ts-item">
            <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
            <div>
              <div className="font-display" style={{ fontSize: 12, fontWeight: 700, color: '#1a2e1a', marginBottom: 4, lineHeight: 1.3 }}>
                {item.title}
              </div>
              <div className="font-serif" style={{ fontSize: 11, color: '#5a6a5a', lineHeight: 1.55 }}>
                {item.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
