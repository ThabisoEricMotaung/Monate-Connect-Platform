import Link from "next/link"

const notices = [
  {
    label: "RFQ Alert",
    text: "New maintenance RFQs available in Mpumalanga — submission deadline approaching",
  },
  {
    label: "Compliance",
    text: "BBBEE certification renewal required for all Q2 2026 tender submissions",
  },
  {
    label: "Tender Notice",
    text: "Infrastructure tender TDR-2026-0441 now open for verified suppliers",
  },
  {
    label: "System Update",
    text: "Supplier profile verification processing time: 24 to 48 hours",
  },
]

export default function Hero() {
  return (
    <section className="newspaper-hero">
      <div className="newspaper-hero__main">
        <p className="newspaper-kicker">Enterprise Access &middot; Tender Readiness</p>

        <h1 className="newspaper-headline">
          Operational supplier access for procurement teams
        </h1>

        <p className="newspaper-body newspaper-drop-cap">
          Secure supplier login for RFQ response, verification workflow, compliance
          review, and procurement readiness across mining and infrastructure sourcing.
        </p>

        <div className="newspaper-hero__actions">
          <Link href="/auth/login" className="masthead__btn-primary">
            Supplier Login
          </Link>
          <Link href="/auth/signup" className="masthead__btn-secondary">
            Register Supplier
          </Link>
        </div>
      </div>

      <aside className="newspaper-hero__sidebar">
        <h2 className="newspaper-sidebar__heading">Latest Notices &amp; Briefs</h2>
        <hr className="newspaper-sidebar__rule" />
        <ul className="newspaper-sidebar__list">
          {notices.map((notice) => (
            <li key={notice.label} className="newspaper-sidebar__item">
              <span className="newspaper-sidebar__tag">{notice.label}</span>
              <p className="newspaper-sidebar__text">{notice.text}</p>
            </li>
          ))}
        </ul>
        <hr className="newspaper-sidebar__rule" />
        <p className="newspaper-sidebar__footer">
          All procurement activity is subject to compliance verification.
        </p>
      </aside>
    </section>
  )
}
