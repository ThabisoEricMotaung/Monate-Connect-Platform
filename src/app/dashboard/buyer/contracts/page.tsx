import Link from "next/link"

export default function BuyerContractsPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Contracts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          View and manage contracts with your suppliers.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">No contracts yet.</p>
        <p className="mt-3 text-sm text-secondary">
          Contracts are created when you award an RFQ to a supplier.
        </p>
        <Link
          href="/dashboard/buyer/rfqs/new"
          className="mt-5 inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-sm font-bold text-button shadow-sm transition hover:bg-accent-strong"
        >
          Create RFQ &rarr;
        </Link>
      </section>
    </div>
  )
}
