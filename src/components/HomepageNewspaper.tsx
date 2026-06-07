import Link from "next/link"

function mastheadDate(): string {
  const d = new Date()
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]
  const day = d.getDate()
  const nth =
    day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd"
    : "th"
  return `${days[d.getDay()]}, ${day}${nth} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const TOP_TORN =
  "M0,0 L15,8 L28,2 L42,10 L55,3 L70,12 L82,4 L96,11 L110,3 L125,9 L138,2 L152,10 " +
  "L165,4 L180,11 L193,3 L208,9 L222,2 L236,10 L250,4 L264,11 L278,3 L292,9 L306,2 " +
  "L320,10 L334,4 L348,11 L362,3 L376,9 L390,2 L404,10 L418,4 L432,11 L446,3 L460,9 " +
  "L474,2 L488,10 L502,4 L516,11 L530,3 L544,9 L558,2 L572,10 L586,4 L600,11 L614,3 " +
  "L628,9 L642,2 L656,10 L670,4 L680,8 L680,28 L0,28 Z"

const BOT_TORN =
  "M0,20 L14,10 L27,18 L41,8 L55,16 L68,6 L82,14 L96,4 L110,12 L124,2 L138,10 " +
  "L152,0 L166,8 L180,18 L194,6 L208,14 L222,4 L236,12 L250,2 L264,10 L278,0 L292,8 " +
  "L306,18 L320,6 L334,14 L348,4 L362,12 L376,2 L390,10 L404,0 L418,8 L432,18 L446,6 " +
  "L460,14 L474,4 L488,12 L502,2 L516,10 L530,0 L544,8 L558,18 L572,6 L586,14 L600,4 " +
  "L614,12 L628,2 L642,10 L656,0 L670,8 L680,16 L680,28 L0,28 Z"

const NP_STYLES = `
  .np-drop-cap::first-letter {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 38px;
    font-weight: 900;
    float: left;
    line-height: 0.8;
    margin: 4px 4px 0 0;
    color: #1a1208;
  }
  .np-cols {
    display: grid;
    grid-template-columns: 1fr 1px 1.8fr 1px 1fr;
  }
  .np-col-divider { background: #1a1208; }
  .np-col-hr {
    display: none;
    height: 0;
    border: none;
    border-top: 1px solid #1a1208;
    margin: 12px 0;
  }
  .np-cta-btn { transition: background 0.15s, color 0.15s; }
  .np-cta-btn:hover { background: #f4efe0 !important; color: #1a1208 !important; }
  @media (max-width: 767px) {
    .np-cols { display: block; }
    .np-col-divider { display: none; }
    .np-col-hr { display: block; }
    .np-cta-bar { flex-direction: column !important; align-items: stretch !important; }
    .np-cta-btn { width: 100%; text-align: center; display: block !important; box-sizing: border-box; }
  }
  @media (max-width: 479px) {
    .np-edition-center { display: none; }
  }
`
export default function HomepageNewspaper() {
  const dateStr = mastheadDate()

  return (
    <div role="region" aria-label="Platform introduction" style={{ position: "relative", overflow: "visible" }}>
      <style dangerouslySetInnerHTML={{ __html: NP_STYLES }}></style>

      <div aria-hidden="true" style={{ position: "absolute", top: 40, right: 60, width: 80, height: 80, borderRadius: "50%", background: "#8B6914", opacity: 0.06, zIndex: 0, pointerEvents: "none" }}></div>
      <div aria-hidden="true" style={{ position: "absolute", bottom: 60, left: 40, width: 50, height: 50, borderRadius: "50%", background: "#8B6914", opacity: 0.06, zIndex: 0, pointerEvents: "none" }}></div>
      <div aria-hidden="true" style={{ position: "absolute", top: 120, left: 200, width: 30, height: 30, borderRadius: "50%", background: "#8B6914", opacity: 0.06, zIndex: 0, pointerEvents: "none" }}></div>

      <svg width="100%" height="28" viewBox="0 0 680 28" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
        <path d={TOP_TORN} fill="#f4efe0"></path>
      </svg>

      <div style={{ background: "#f4efe0", borderBottom: "3px double #1a1208", padding: "16px 24px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3a2e1a", whiteSpace: "nowrap", fontFamily: "Georgia, serif" }}>
            Est. 2026 &middot; Pretoria, Gauteng
          </span>
          <div style={{ flex: 1, height: "0.5px", background: "#1a1208" }} aria-hidden="true"></div>
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3a2e1a", whiteSpace: "nowrap", fontFamily: "Georgia, serif" }}>
            {dateStr}
          </span>
        </div>
        <h1 style={{ fontFamily: "'UnifrakturMaguntia', 'Playfair Display', Georgia, serif", fontSize: "clamp(36px, 6vw, 52px)", color: "#1a1208", textAlign: "center", lineHeight: 1.1, margin: 0 }}>
          Monate Connect
        </h1>
        <p aria-hidden="true" style={{ textAlign: "center", color: "#5a4a2a", letterSpacing: 8, margin: "6px 0 4px", fontSize: 14, fontFamily: "Georgia, serif" }}>
          {"— ✶ —"}
        </p>
        <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#3a2e1a", textAlign: "center", margin: 0, fontFamily: "Georgia, serif" }}>
          South Africa&#39;s Verified Procurement Network &middot; Pilot Edition
        </p>
      </div>

      <div style={{ background: "#ede8d4", borderTop: "1px solid #1a1208", borderBottom: "1px solid #1a1208", padding: "5px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3a2e1a", fontFamily: "Georgia, serif" }}>Vol. I &middot; No. 1</span>
        <span className="np-edition-center" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3a2e1a", fontFamily: "Georgia, serif" }}>
          CSD &middot; BBBEE &middot; SARS &middot; CIPC &middot; National Treasury
        </span>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3a2e1a", fontFamily: "Georgia, serif" }}>Free during pilot &middot; Until Aug 2026</span>
      </div>

      <div style={{ background: "#f4efe0", borderBottom: "2px solid #1a1208", padding: "14px 24px 10px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, lineHeight: 1.1, color: "#1a1208", margin: "0 0 8px" }}>
          Where Verified Suppliers<br></br><em>Meet Real Procurement.</em>
        </h2>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 15, color: "#3a2e1a", lineHeight: 1.5, maxWidth: 520, margin: "0 auto 8px" }}>
          Live RFQs from Eskom, municipalities &amp; parastatals &mdash; matched to your BBBEE level, province &amp; industry. No cold calls. No gatekeepers.
        </p>
        <p style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5a4a2a", margin: 0, fontFamily: "Georgia, serif" }}>
          &mdash; Procurement Correspondent &middot; Monate Connect Gazette
        </p>
      </div>
      <div style={{ background: "#f4efe0", padding: "16px 0 8px" }}>
        <div className="np-cols">

          <div style={{ padding: "0 18px" }}>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #1a1208", paddingBottom: 4, marginBottom: 8, color: "#1a1208" }}>
              For Suppliers
            </h3>
            <p className="np-drop-cap" style={{ fontFamily: "'IM Fell English', Georgia, serif", fontSize: "11.5px", lineHeight: 1.65, color: "#2a1f0e", textAlign: "justify", margin: "0 0 12px" }}>
              Register your business, upload your CSD number and BBBEE certificate, and receive a SmartScore &mdash; a 0 to 100 trust rating visible to every procurement team on the platform. Matched RFQs arrive directly in your dashboard. No more trawling government websites or missing closing dates.
            </p>
            <div style={{ border: "1px solid #1a1208", padding: 8, textAlign: "center" }}>
              <p style={{ fontSize: 11, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1a1208", margin: "0 0 4px" }}>Register Free</p>
              <p style={{ fontSize: 10, color: "#3a2e1a", margin: 0, fontFamily: "Georgia, serif" }}>Verification in 48 hours. No credit card required.</p>
            </div>
          </div>

          <div className="np-col-divider"></div>

          <div style={{ padding: "0 18px" }}>
            <hr className="np-col-hr"></hr>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #1a1208", paddingBottom: 4, marginBottom: 8, color: "#1a1208" }}>
              The SmartScore Explained
            </h3>
            <p style={{ fontFamily: "'IM Fell English', Georgia, serif", fontSize: "11.5px", lineHeight: 1.65, color: "#2a1f0e", textAlign: "justify", margin: 0 }}>
              Every supplier on this platform carries a SmartScore &mdash; a verified trust rating drawn from four official South African compliance sources. CSD registration confirms active status on the National Treasury database. BBBEE certification is validated against the issuing agency. SARS tax clearance is re-validated every ninety days. Banking details are confirmed against CIPC registration records. A score of ninety or above places a supplier in the priority tier &mdash; first in buyer searches, first on matched RFQ notifications.
            </p>
          </div>

          <div className="np-col-divider"></div>

          <div style={{ padding: "0 18px" }}>
            <hr className="np-col-hr"></hr>
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #1a1208", paddingBottom: 4, marginBottom: 8, color: "#1a1208" }}>
              For Buyers
            </h3>
            <p className="np-drop-cap" style={{ fontFamily: "'IM Fell English', Georgia, serif", fontSize: "11.5px", lineHeight: 1.65, color: "#2a1f0e", textAlign: "justify", margin: "0 0 12px" }}>
              Post an RFQ in under five minutes. Set your BBBEE requirement, target province, and estimated value range. Verified suppliers matching your criteria are notified immediately. Compare quotes side by side &mdash; each one carrying the supplier&#39;s SmartScore, BBBEE level, and verification badges.
            </p>
            <div style={{ border: "1px solid #1a1208", padding: 8, textAlign: "center" }}>
              <p style={{ fontSize: 11, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#1a1208", margin: "0 0 4px" }}>Request Access</p>
              <p style={{ fontSize: 10, color: "#3a2e1a", margin: 0, fontFamily: "Georgia, serif" }}>Buyer accounts available to verified organisations.</p>
            </div>
          </div>

        </div>
      </div>

      <div className="np-cta-bar" style={{ background: "#1a1208", color: "#f4efe0", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 13, margin: 0, color: "#f4efe0" }}>
          The procurement network South Africa has been waiting for.
        </p>
        <Link
          href="/auth/signup"
          className="np-cta-btn"
          style={{ border: "1px solid #f4efe0", color: "#f4efe0", background: "transparent", padding: "5px 18px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'IM Fell English', Georgia, serif", display: "inline-block", textDecoration: "none" }}
        >
          Register as supplier &rarr;
        </Link>
        <Link
          href="/auth/login?role=admin"
          className="np-cta-btn"
          style={{ border: "1px solid #f4efe0", color: "#f4efe0", background: "transparent", padding: "5px 18px", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'IM Fell English', Georgia, serif", display: "inline-block", textDecoration: "none" }}
        >
          Buyer access &rarr;
        </Link>
      </div>

      <svg width="100%" height="28" viewBox="0 0 680 28" preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
        <path d={BOT_TORN} fill="#f4efe0"></path>
      </svg>
    </div>
  )
}