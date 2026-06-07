export default function AdminInvoicesPage() {
  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Procurement
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">Invoices</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Review and approve invoices from suppliers.
        </p>
      </div>

      <section className="rounded-md border border-panel bg-card p-10 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">
          No invoices received yet. Invoices will appear here once suppliers submit them against confirmed purchase orders.
        </p>
      </section>
    </div>
  )
}
