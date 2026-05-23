import Link from "next/link"
import { supabase } from "@/lib/supabase"

type SupplierCard = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  verification_status: string | null
}

function statusLabel(status: string | null): string {
  return status || "Pending Review"
}

export default async function SupplierSpotlight() {
  let suppliers: SupplierCard[] = []
  let loadError = ""

  if (!supabase) {
    loadError = "Supplier directory is not configured."
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, business_name, province, industry, verification_status")
      .eq("verification_status", "Verified")
      .order("business_name", { ascending: true })

    if (error) {
      loadError = error.message
    } else {
      suppliers = (data ?? []) as SupplierCard[]
    }
  }

  return (
    <section id="suppliers" className="mx-auto max-w-7xl px-6 pb-24">

      <div className="mb-14 text-center">

        <h2 className="text-4xl font-bold md:text-5xl">
          Trusted Supplier Network
        </h2>

        <p className="mx-auto mt-4 max-w-3xl text-lg text-secondary">
          Discover emerging African suppliers ready for procurement opportunities.
        </p>

      </div>

      {loadError && (
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-8 text-center">
          <p className="text-sm font-semibold text-rose-700">{loadError}</p>
        </div>
      )}

      {!loadError && suppliers.length === 0 && (
        <div className="rounded-3xl border border-panel bg-card p-10 text-center">
          <p className="text-sm font-semibold text-heading">No verified suppliers available yet.</p>
          <p className="mt-2 text-sm text-muted">
            Verified supplier profiles will appear here as the network grows.
          </p>
        </div>
      )}

      {!loadError && suppliers.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="rounded-3xl border border-panel bg-card p-8 transition-colors hover:border-accent/70"
            >

              <div className="mb-6 flex items-center justify-between">

                <div className="h-16 w-16 rounded-2xl bg-accent-soft supplier-logo meta-logo" />

                <div className="verified-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="inline-block mr-2" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{statusLabel(supplier.verification_status)}</span>
                </div>

              </div>

              <h3 className="text-2xl font-semibold text-heading">
                {supplier.business_name || "Supplier"}
              </h3>

              <p className="mt-3 text-secondary">
                {supplier.industry || "Procurement Supplier"}
              </p>

              <div className="mt-6 flex items-center justify-between">

                <span className="text-sm text-muted">
                  {supplier.province || "South Africa"}
                </span>

                <Link
                  href={`/suppliers/${supplier.id}`}
                  className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-button transition-colors hover:bg-accent-strong"
                >
                  View Profile
                </Link>

              </div>

            </div>
          ))}

        </div>
      )}

    </section>
  )
}
