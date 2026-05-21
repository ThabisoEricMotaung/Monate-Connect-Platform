const features = [
  {
    title: "Supplier Verification",
    description:
      "Build trust with verified township and industrial suppliers across Africa.",
  },
  {
    title: "RFQ Management",
    description:
      "Receive, manage, and respond to procurement opportunities efficiently.",
  },
  {
    title: "Mining Ecosystem",
    description:
      "Connect SMEs with mining, Eskom, and infrastructure procurement networks.",
  },
  {
    title: "WhatsApp Workflows",
    description:
      "Enable supplier communication and onboarding directly through WhatsApp.",
  },
]

export default function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">

      <div className="mb-14 text-center">
        <h2 className="text-4xl font-bold md:text-5xl">
          Built for African Business Growth
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-lg text-secondary">
          Monate Vendor Network helps suppliers become discoverable,
          procurement-ready, and trusted by large buyers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-3xl border border-panel bg-card p-8 transition-colors hover:border-accent/70"
          >
            <div className="mb-6 h-14 w-14 rounded-2xl bg-accent-soft" />

            <h3 className="text-2xl font-semibold text-heading">
              {feature.title}
            </h3>

            <p className="mt-4 text-secondary">
              {feature.description}
            </p>
          </div>
        ))}

      </div>

    </section>
  )
}