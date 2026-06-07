import Link from "next/link"

export default function AdminRfqsPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">RFQs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Manage your active and draft requests for quotation.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">
          No active RFQs yet. Create your first RFQ to start receiving quotes from verified suppliers.
        </p>
        <Link
          href="/dashboard/admin/rfqs/new"
          className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
        >
          Create new RFQ -&gt;
        </Link>
      </section>
    </div>
  )
}
