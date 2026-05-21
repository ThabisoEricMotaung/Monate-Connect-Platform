const suppliers = [
  {
    name: "Makwande Civils",
    category: "Construction",
    location: "Mpumalanga",
  },
  {
    name: "Siyakhula Mining Supplies",
    category: "Mining Services",
    location: "Limpopo",
  },
  {
    name: "Ubuntu Electrical",
    category: "Electrical",
    location: "Gauteng",
  },
]

export default function SupplierSpotlight() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">

      <div className="mb-14 text-center">

        <h2 className="text-4xl font-bold md:text-5xl">
          Trusted Supplier Network
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-lg text-secondary">
          Discover emerging African suppliers ready for procurement opportunities.
        </p>

      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {suppliers.map((supplier) => (
          <div
            key={supplier.name}
            className="rounded-3xl border border-panel bg-card p-8 transition hover:border-accent hover:bg-accent-soft"
          >

            <div className="mb-6 flex items-center justify-between">

              <div className="h-16 w-16 rounded-2xl bg-accent-soft supplier-logo meta-logo" />

              <div className="verified-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block mr-2" aria-hidden>
                  <path d="M20 6L9 17l-5-5" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Verified</span>
              </div>

            </div>

            <h3 className="text-2xl font-semibold text-heading">
              {supplier.name}
            </h3>

            <p className="mt-3 text-secondary">
              {supplier.category}
            </p>

            <div className="mt-6 flex items-center justify-between">

              <span className="text-sm text-muted">
                {supplier.location}
              </span>

              <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-button transition hover:bg-accent-strong">
                View Profile
              </button>

            </div>

          </div>
        ))}

      </div>

    </section>
  )
}