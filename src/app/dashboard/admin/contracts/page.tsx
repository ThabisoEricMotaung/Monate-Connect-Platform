import Link from "next/link"

export default function AdminContractsPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Contracts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          View and manage contracts from awarded RFQs.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">
          No contracts yet. Contracts are generated automatically when you award an RFQ to a supplier.
        </p>
        <Link
          href="/dashboard/admin/rfqs"
          className="mt-5 inline-flex rounded-md border border-panel bg-panel px-4 py-2 text-sm font-bold text-heading shadow-sm transition hover:border-accent hover:text-accent"
        >
          View awarded RFQs -&gt;
        </Link>
      </section>
    </div>
  )
}
