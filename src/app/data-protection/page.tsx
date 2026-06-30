import Link from "next/link"
import BackLink from "@/components/BackLink"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const protectionSections = [
  {
    title: "POPIA-Aware Approach",
    body:
      "AiForm Procure should be operated with awareness of South Africa's Protection of Personal Information Act. Production policies should define responsible parties, lawful processing grounds, retention, access handling and cross-border considerations where relevant.",
  },
  {
    title: "Data Security Principles",
    body:
      "Security principles include collecting only necessary data, protecting sensitive supplier and procurement records, limiting access by role, monitoring important activity and maintaining reliable operational controls.",
  },
  {
    title: "Access Control",
    body:
      "Access should be restricted according to user role and business need. Supplier, buyer, admin and finance workflows should only expose information needed for authorised procurement activity.",
  },
  {
    title: "Supplier Document Protection",
    body:
      "Supplier documents such as compliance evidence and banking verification support should be protected from public exposure and handled through controlled review workflows.",
  },
  {
    title: "User Rights",
    body:
      "Users may need mechanisms to request access, correction, deletion, restriction or review of personal information, subject to lawful procurement, audit and recordkeeping obligations.",
  },
  {
    title: "Contact for Data Queries",
    body:
      "Data protection questions, access requests or correction requests should be directed through the contact channel until a formal information officer or privacy contact is appointed.",
  },
  {
    title: "Audit and Accountability",
    body:
      "Audit logs, workflow records and governance reports can help demonstrate how procurement decisions, supplier changes and document reviews were handled.",
  },
  {
    title: "Professional Placeholder",
    body:
      "This data protection page is not final legal advice. It should be reviewed against the final data architecture, Supabase configuration, storage controls and operating entity obligations.",
  },
]

export default function DataProtectionPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page text-primary">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="border-b border-t border-heading py-10">
          <BackLink />
          <p className="mt-4 newspaper-kicker">Legal Desk &middot; Data Protection</p>
          <h1 className="newspaper-headline mt-5">Data Protection</h1>
          <p className="newspaper-body mt-6 max-w-3xl">
            This page sets out POPIA-aware placeholder principles for protecting supplier,
            buyer, compliance and procurement workflow data inside AiForm Procure.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="masthead__btn-primary">
              Contact for Data Queries
            </Link>
            <Link href="/privacy" className="masthead__btn-secondary">
              Privacy Policy
            </Link>
          </div>
        </div>

        <aside className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-accent">
            Protection Principles
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-heading">
            Role-based access, document control and accountability
          </h2>
          <p className="mt-4 text-sm leading-7 text-secondary">
            Final controls should align with production RLS policies, storage rules, user roles,
            incident response, data retention and supplier document handling procedures.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Last updated: 4 June 2026
          </p>
        </aside>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-20 md:grid-cols-2">
        {protectionSections.map((section) => (
          <article key={section.title} className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <h2 className="text-2xl font-semibold text-heading">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-secondary">{section.body}</p>
          </article>
        ))}
      </section>
      </main>
      <PublicFooter />
    </>
  )
}
