const CTA_STYLES = `
  .cta-wrap {
    background: #1a3a2a;
    padding: 16px 32px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .cta-btn-gold {
    background: #c8a060;
    color: #1a3a2a;
    border: 2px solid #c8a060;
    border-radius: 2px;
    padding: 8px 20px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
    cursor: pointer;
    display: inline-block;
  }
  .cta-btn-gold:hover {
    background: #DFC06E;
    border-color: #DFC06E;
    color: #1a3a2a;
  }
  .cta-btn-outline {
    background: transparent;
    color: #c8a060;
    border: 1.5px solid #c8a060;
    border-radius: 2px;
    padding: 8px 20px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
    transition: background 200ms ease, color 200ms ease;
    cursor: pointer;
    display: inline-block;
  }
  .cta-btn-outline:hover {
    background: rgba(200, 160, 96, 0.10);
    color: #DFC06E;
  }
  @media (max-width: 767px) {
    .cta-wrap {
      flex-direction: column;
      align-items: stretch;
      padding: 16px 20px;
      gap: 12px;
    }
    .cta-btn-gold, .cta-btn-outline {
      text-align: center;
      width: 100%;
    }
  }
`

export default function CTASection() {
  return (
    <div className="cta-wrap">
      <style dangerouslySetInnerHTML={{ __html: CTA_STYLES }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #5DCAA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <p className="font-display" style={{ fontSize: 16, fontStyle: 'italic', color: '#E1F5EE', margin: 0, lineHeight: 1.4 }}>
          The procurement network South Africa has been waiting for.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="/auth/signup" className="cta-btn-gold">
          Register as supplier &rarr;
        </a>
        <a href="/auth/login?role=admin" className="cta-btn-outline">
          Buyer access &rarr;
        </a>
      </div>
    </div>
  )
}
