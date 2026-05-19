import { getQuotes } from "@/lib/quotes"

export default async function QuotesPage() {

  const quotes = await getQuotes()

  return (
    <div>

      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">
          Submitted quotes
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Quote tracking
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
          Monitor supplier proposals and procurement responses in a structured enterprise list.
        </p>
      </div>

      <div className="space-y-4">
        {quotes.map((quote: any) => (
          <article
            key={quote.id}
            className="rounded-lg border border-slate-700 bg-[#08120e] p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Quote #{quote.id}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {quote.rfqs?.title || "Quote record"}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Supplier: {quote.supplier_name}
                </p>
              </div>
              <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-medium text-yellow-300">
                {quote.status}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-slate-700 bg-[#07120f] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Quote amount
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{quote.amount}</p>
              </div>
              <div className="rounded-md border border-slate-700 bg-[#07120f] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  RFQ title
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{quote.rfqs?.title || "Unknown"}</p>
              </div>
            </div>

            <div className="mt-5 rounded-md border border-slate-700 bg-[#07120f] p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Supplier message
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{quote.message}</p>
            </div>
          </article>
        ))}
      </div>

    </div>
  )
}