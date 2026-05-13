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

        <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-400">
          Discover emerging African suppliers ready for procurement opportunities.
        </p>

      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

        {suppliers.map((supplier) => (
          <div
            key={supplier.name}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur transition hover:border-green-500/40 hover:bg-white/10"
          >

            <div className="mb-6 flex items-center justify-between">

              <div className="h-16 w-16 rounded-2xl bg-green-500/20" />

              <div className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300">
                Verified
              </div>

            </div>

            <h3 className="text-2xl font-semibold">
              {supplier.name}
            </h3>

            <p className="mt-3 text-gray-400">
              {supplier.category}
            </p>

            <div className="mt-6 flex items-center justify-between">

              <span className="text-sm text-gray-500">
                {supplier.location}
              </span>

              <button className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-400">
                View Profile
              </button>

            </div>

          </div>
        ))}

      </div>

    </section>
  )
}