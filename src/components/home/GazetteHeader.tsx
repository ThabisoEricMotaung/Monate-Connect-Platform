const GAZETTE_STYLES = `
  .gz-secondary { display: flex; justify-content: space-between; align-items: center; }
  @media (max-width: 767px) {
    .gz-side { display: none; }
    .gz-secondary { justify-content: center; }
  }
`

export default function GazetteHeader() {
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: GAZETTE_STYLES }} />
      <div style={{ background: '#1a3a2a', textAlign: 'center', padding: '5px 16px' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9FE1CB', fontFamily: 'system-ui, sans-serif' }}>
          South Africa&#39;s Verified Procurement Network &middot; Pilot Edition
        </span>
      </div>
      <div className="gz-secondary" style={{ background: '#f8f4ec', borderBottom: '2px solid #1a3a2a', padding: '2px 24px', gap: 12 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6a5a3a', fontFamily: 'system-ui, sans-serif' }}>
          CSD &middot; BBBEE &middot; SARS &middot; CIPC &middot; National Treasury
        </span>
        <span className="gz-side" style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6a5a3a', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>
          Free during pilot &middot; Until Aug 2026
        </span>
      </div>
    </div>
  )
}
