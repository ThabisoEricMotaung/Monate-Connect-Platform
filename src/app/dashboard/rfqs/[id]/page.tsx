import Link from "next/link"
import { notFound } from "next/navigation"
import { rfqs } from "@/data/rfqs"

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function RFQDetailPage({ params }: Props) {

  const { id } = await params

  const rfq = rfqs.find(
    (item) => item.id === Number(id)
  )

  if (!rfq) {
    notFound()
  }

  return (

    <div className="mx-auto max-w-6xl">

      <div className="mb-10">

        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Procurement Opportunity
        </p>

        <h1 className="mt-4 text-5xl font-bold text-slate-900 dark:text-white">
          {rfq.title}
        </h1>

        <p className="mt-6 max-w-4xl text-xl leading-relaxed text-slate-600 dark:text-slate-300">
          {rfq.description}
        </p>

      </div>

      <div className="grid gap-6 md:grid-cols-4">

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
            Province
          </p>

          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {rfq.region}
          </p>

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
            Category
          </p>

          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {rfq.category}
          </p>

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
            Budget
          </p>

          <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
            {rfq.budget}
          </p>

        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">

          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
            Status
          </p>

          <p className="mt-4 text-2xl font-semibold text-emerald-600">
            Open
          </p>

        </div>

      </div>

      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900">

        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
          Scope of Work
        </h2>

        <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">

          <p>
            Suppliers are expected to provide all required materials,
            operational capacity, delivery coordination, and compliance
            documentation related to this procurement request.
          </p>

          <p>
            Preference may be given to verified township suppliers,
            black-owned SMEs, and vendors with mining or municipal
            procurement experience.
          </p>

          <p>
            Suppliers should ensure that quotations include VAT status,
            turnaround timelines, and operational coverage areas.
          </p>

        </div>

      </div>

      <div className="mt-10 flex flex-wrap gap-4">

        <Link
          href={`/dashboard/rfqs/${rfq.id}/submit`}
          className="rounded-2xl bg-[#556B88] px-8 py-4 text-lg font-semibold text-white transition hover:opacity-90"
        >
          Submit Quote
        </Link>

        <Link
          href="/dashboard/rfqs"
          className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-800 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          Back to RFQs
        </Link>

      </div>

    </div>

  )
}
