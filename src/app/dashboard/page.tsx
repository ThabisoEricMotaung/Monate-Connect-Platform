"use client"

export default function DashboardPage() {

  return (
    <div>

      <div className="mb-10">

        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-accent">
          Procurement Operations
        </p>

        <h1 className="text-5xl font-bold text-primary">
          Supplier Dashboard
        </h1>

        <p className="mt-4 max-w-3xl text-lg text-secondary">
          Manage procurement opportunities, supplier verification,
          RFQ participation, and quote submissions from your workspace.
        </p>

      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Verification
          </p>

          <h2 className="mt-4 text-3xl font-bold text-accent">
            Pending
          </h2>

        </div>

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Active RFQs
          </p>

          <h2 className="mt-4 text-3xl font-bold text-primary">
            12
          </h2>

        </div>

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Submitted Quotes
          </p>

          <h2 className="mt-4 text-3xl font-bold text-primary">
            4
          </h2>

        </div>

        <div className="rounded-xl border border-panel bg-surface p-6 shadow-panel">

          <p className="text-sm uppercase tracking-widest text-secondary">
            Supplier Status
          </p>

          <h2 className="mt-4 text-3xl font-bold text-accent">
            Active
          </h2>

        </div>

      </div>

    </div>
  )
}