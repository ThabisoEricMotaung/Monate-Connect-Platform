"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { requireAdminOrBuyer } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

type PurchaseOrder = {
  id: number
  po_number: string | null
  rfq_id: number | null
  quote_id: number | null
  supplier_id: string | null
  supplier_name: string | null
  amount: string | null
  timeline: string | null
  title: string | null
  status: string | null
  generated_at: string | null
}

type RFQ = {
  id: number
  title: string | null
  category: string | null
  province: string | null
  budget: string | null
  deadline: string | null
  status: string | null
  description: string | null
}

type Quote = {
  id: number
  supplier_name: string | null
  amount: string | null
  timeline: string | null
  status: string | null
  scope: string | null
  supporting_notes: string | null
  created_at: string | null
}

type SupplierProfile = {
  id: string
  business_name: string | null
  province: string | null
  industry: string | null
  phone: string | null
  email: string | null
  verification_status: string | null
  csd_number: string | null
  bbbee_level: string | null
}

const statusStyles: Record<string, string> = {
  Generated: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Issued: "border-accent-soft bg-accent-soft text-accent-strong",
  Approved: "border-success bg-success-soft text-success",
  Cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

function statusBadgeClass(status: string | null): string {
  return statusStyles[status || ""] ?? "border-panel bg-panel text-secondary"
}

function formatAmount(amount: string | null): string {
  if (!amount) return "-"

  const cleanAmount = amount.replace(/[^\d]/g, "")
  const numericAmount = Number(cleanAmount)

  if (!cleanAmount || Number.isNaN(numericAmount)) return amount

  return `R${numericAmount.toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  })}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-"

  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function DetailField({
  label,
  value,
  className = "",
}: {
  label: string
  value: string | null
  className?: string
}) {
  return (
    <div className={`rounded-md border border-panel bg-panel p-4 ${className}`}>
      <p className="text-[0.67rem] uppercase tracking-[0.24em] text-secondary">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-heading">
        {value || "-"}
      </p>
    </div>
  )
}

function PurchaseOrderSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-md border border-panel bg-card p-6 shadow-panel"
        >
          <div className="h-5 w-72 animate-pulse rounded bg-panel" />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((__, fieldIndex) => (
              <div
                key={fieldIndex}
                className="h-16 animate-pulse rounded-md bg-panel"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminPurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const purchaseOrderId = Number(params.id)
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null)
  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [supplier, setSupplier] = useState<SupplierProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadPurchaseOrder() {
      const authorizedProfile = await requireAdminOrBuyer()

      if (!authorizedProfile) {
        router.replace("/dashboard")
        return
      }

      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      if (!Number.isFinite(purchaseOrderId)) {
        setErrorMessage("Invalid purchase order reference.")
        setLoading(false)
        return
      }

      const { data: purchaseOrderData, error: purchaseOrderError } =
        await supabase
          .from("purchase_orders")
          .select("id, po_number, rfq_id, quote_id, supplier_id, supplier_name, amount, timeline, title, status, generated_at")
          .eq("id", purchaseOrderId)
          .single()

      if (purchaseOrderError) {
        setErrorMessage(purchaseOrderError.message)
        setLoading(false)
        return
      }

      const loadedPurchaseOrder = purchaseOrderData as PurchaseOrder

      setPurchaseOrder(loadedPurchaseOrder)

      const [rfqResult, quoteResult, supplierResult] = await Promise.all([
        loadedPurchaseOrder.rfq_id
          ? supabase
              .from("rfqs")
              .select("id, title, category, province, budget, deadline, status, description")
              .eq("id", loadedPurchaseOrder.rfq_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        loadedPurchaseOrder.quote_id
          ? supabase
              .from("quotes")
              .select("id, supplier_name, amount, timeline, status, scope, supporting_notes, created_at")
              .eq("id", loadedPurchaseOrder.quote_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        loadedPurchaseOrder.supplier_id
          ? supabase
              .from("profiles")
              .select("id, business_name, province, industry, phone, email, verification_status, csd_number, bbbee_level")
              .eq("id", loadedPurchaseOrder.supplier_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (rfqResult.error) {
        setErrorMessage(rfqResult.error.message)
        setLoading(false)
        return
      }

      if (quoteResult.error) {
        setErrorMessage(quoteResult.error.message)
        setLoading(false)
        return
      }

      if (supplierResult.error) {
        setErrorMessage(supplierResult.error.message)
        setLoading(false)
        return
      }

      setRfq(rfqResult.data as RFQ | null)
      setQuote(quoteResult.data as Quote | null)
      setSupplier(supplierResult.data as SupplierProfile | null)
      setLoading(false)
    }

    loadPurchaseOrder()
  }, [purchaseOrderId, router])

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Admin / Purchase Order
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {purchaseOrder?.po_number || "Purchase Order"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Printable procurement record generated from the awarded RFQ quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/purchase-orders"
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface hover:text-heading"
          >
            Back to POs
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Print Purchase Order
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Purchase order failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {loading && <PurchaseOrderSkeleton />}

      {!loading && !errorMessage && !purchaseOrder && (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            Purchase order not found.
          </p>
          <p className="mt-2 text-xs text-muted">
            Return to the purchase order register and select an active record.
          </p>
        </div>
      )}

      {!loading && !errorMessage && purchaseOrder && (
        <div className="print-document space-y-6">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="flex flex-col gap-4 border-b border-panel pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                  Procurement Summary
                </p>
                <h2 className="mt-2 text-xl font-semibold text-heading">
                  {purchaseOrder.title || rfq?.title || "Awarded RFQ"}
                </h2>
              </div>
              <span
                className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusBadgeClass(purchaseOrder.status)}`}
              >
                {purchaseOrder.status || "Generated"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <DetailField
                label="PO Number"
                value={purchaseOrder.po_number || `PO-${purchaseOrder.id}`}
              />
              <DetailField
                label="Issue Date"
                value={formatDateTime(purchaseOrder.generated_at)}
              />
              <DetailField
                label="Amount"
                value={formatAmount(purchaseOrder.amount || quote?.amount || null)}
              />
              <DetailField
                label="Supplier"
                value={
                  purchaseOrder.supplier_name ||
                  supplier?.business_name ||
                  quote?.supplier_name ||
                  null
                }
              />
              <DetailField
                label="Delivery Timeline"
                value={purchaseOrder.timeline || quote?.timeline || null}
              />
              <DetailField
                label="RFQ Reference"
                value={purchaseOrder.rfq_id ? `RFQ-${purchaseOrder.rfq_id}` : null}
              />
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                Supplier Details
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {supplier?.business_name ||
                  purchaseOrder.supplier_name ||
                  "Supplier Profile"}
              </h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <DetailField label="Industry" value={supplier?.industry ?? null} />
              <DetailField label="Province" value={supplier?.province ?? null} />
              <DetailField label="Phone" value={supplier?.phone ?? null} />
              <DetailField label="Email" value={supplier?.email ?? null} />
              <DetailField
                label="Verification"
                value={supplier?.verification_status ?? null}
              />
              <DetailField label="CSD Number" value={supplier?.csd_number ?? null} />
              <DetailField
                label="B-BBEE Level"
                value={supplier?.bbbee_level ?? null}
              />
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                RFQ Details
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {rfq?.title || purchaseOrder.title || "RFQ Record"}
              </h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <DetailField label="Category" value={rfq?.category ?? null} />
              <DetailField label="Province" value={rfq?.province ?? null} />
              <DetailField label="Budget" value={formatAmount(rfq?.budget ?? null)} />
              <DetailField label="Deadline" value={formatDate(rfq?.deadline ?? null)} />
              <DetailField label="RFQ Status" value={rfq?.status ?? null} />
              <DetailField
                label="Description"
                value={rfq?.description ?? null}
                className="md:col-span-3"
              />
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-secondary">
                Quote Details
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                Quote {purchaseOrder.quote_id ? `Q-${purchaseOrder.quote_id}` : ""}
              </h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <DetailField
                label="Quoted Amount"
                value={formatAmount(quote?.amount || purchaseOrder.amount)}
              />
              <DetailField
                label="Timeline"
                value={quote?.timeline || purchaseOrder.timeline || null}
              />
              <DetailField label="Quote Status" value={quote?.status ?? null} />
              <DetailField
                label="Submitted"
                value={formatDateTime(quote?.created_at ?? null)}
              />
              <DetailField
                label="Scope"
                value={quote?.scope ?? null}
                className="md:col-span-3"
              />
              <DetailField
                label="Supporting Notes"
                value={quote?.supporting_notes ?? null}
                className="md:col-span-3"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
