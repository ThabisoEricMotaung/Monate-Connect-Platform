const stats = [
  {
    value: "2,500+",
    label: "Verified Vendors",
  },
  {
    value: "R120M+",
    label: "Procurement Requests",
  },
  {
    value: "18",
    label: "Industry Categories",
  },
  {
    value: "9 Provinces",
    label: "Supplier Reach",
  },
]

export default function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur"
          >
            <h3 className="text-5xl font-bold text-green-400">
              {stat.value}
            </h3>

            <p className="mt-4 text-lg text-gray-400">
              {stat.label}
            </p>
          </div>
        ))}

      </div>

    </section>
  )
}