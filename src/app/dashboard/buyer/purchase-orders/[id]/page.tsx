import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type PageProps = { params: Promise<{ id: string }> }

function formatAmount(amount: string | null): string {
  if (!amount) return "-"
  const clean = amount.replace(/[^\d.]/g, "")
  const numeric = Number(clean)
  return clean && Number.isFinite(numeric)
    ? `R${numeric.toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`
    : amount
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
  })
}

export default async function BuyerPurchaseOrderDetailPage({ params }: PageProps) {
  if (!supabaseAdmin) notFound()
  const { id } = await params
  const purchaseOrderId = Number(id)
  if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [profileResult, purchaseOrderResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabaseAdmin
      .from("purchase_orders")
      .select("id, po_number, rfq_id, quote_id, supplier_name, title, amount, timeline, status, generated_at, issue_date")
      .eq("id", purchaseOrderId)
      .maybeSingle(),
  ])
  if (profileResult.error || purchaseOrderResult.error || !purchaseOrderResult.data) notFound()

  const purchaseOrder = purchaseOrderResult.data
  const rfqResult = purchaseOrder.rfq_id
    ? await supabaseAdmin
        .from("rfqs")
        .select("id, created_by, title, category, province, deadline, status")
        .eq("id", purchaseOrder.rfq_id)
        .maybeSingle()
    : { data: null, error: null }
  if (rfqResult.error || !rfqResult.data) notFound()

  const role = String(profileResult.data?.role ?? "").toLowerCase()
  if (role !== "buyer" || rfqResult.data.created_by !== user.id) notFound()

  const quoteResult = purchaseOrder.quote_id
    ? await supabaseAdmin
        .from("quotes")
        .select("id, amount, timeline, status, scope, delivery_lead_time, payment_terms, validity_days")
        .eq("id", purchaseOrder.quote_id)
        .eq("rfq_id", rfqResult.data.id)
        .maybeSingle()
    : { data: null, error: null }
  if (quoteResult.error) notFound()

  const fields = [
    ["PO number", purchaseOrder.po_number || `PO-${purchaseOrder.id}`],
    ["Supplier", purchaseOrder.supplier_name || "-"],
    ["Amount", formatAmount(purchaseOrder.amount)],
    ["Status", purchaseOrder.status || "Generated"],
    ["Issue date", formatDate(purchaseOrder.issue_date)],
    ["Generated", formatDate(purchaseOrder.generated_at)],
    ["Delivery timeline", purchaseOrder.timeline || quoteResult.data?.delivery_lead_time || quoteResult.data?.timeline || "-"],
    ["Payment terms", quoteResult.data?.payment_terms || "-"],
  ]

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">Buyer / Purchase Order</p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">{purchaseOrder.title || rfqResult.data.title || `PO-${purchaseOrder.id}`}</h1>
        <p className="mt-3 text-sm text-secondary">A buyer-safe procurement record for the awarded quote.</p>
      </div>

      <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">{label}</p>
              <p className="mt-2 text-sm font-semibold text-heading">{value}</p>
            </div>
          ))}
        </div>
        {quoteResult.data?.scope && (
          <div className="mt-5 border-t border-panel pt-5">
            <h2 className="text-sm font-semibold text-heading">Awarded scope</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-secondary">{quoteResult.data.scope}</p>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/buyer/purchase-orders" className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">Back to purchase orders</Link>
        <Link href={`/dashboard/buyer/rfqs/${rfqResult.data.id}/quotes`} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">View quote comparison</Link>
      </div>
    </div>
  )
}
