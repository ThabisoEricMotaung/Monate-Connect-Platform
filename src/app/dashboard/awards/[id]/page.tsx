"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { getCurrentProfile, hasAdminOrBuyerAccess, type AuthProfile } from "@/lib/auth"
import {
  createContract,
  getContractById,
  normalizeContractStatus,
  updateContractStatus,
  type Contract,
} from "@/lib/contracts"
import {
  createInvoice,
  getInvoiceById,
  parseCurrencyToNumber,
  updateInvoiceStatus,
  type Invoice,
} from "@/lib/invoices"
import {
  getEstimatedDeliveryDate,
  getPurchaseOrderById,
  getPurchaseOrderTimeline,
  normalizePurchaseOrderStatus,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
} from "@/lib/purchaseOrders"
import { calculateSupplierSmartScore } from "@/lib/smartScore"
import { supabase } from "@/lib/supabase"

type AwardTab = "po" | "contract" | "invoices"

type ActivityEvent = {
  id: number
  action: string
  created_at: string | null
  actor_email: string | null
  metadata: Record<string, unknown> | null
}

type InvoiceDraft = {
  invoiceNumber: string
  invoiceDate: string
  note: string
  proofName: string
  taxInvoiceName: string
  amount: string
}

const steps = [
  "RFQ awarded",
  "PO issued",
  "PO confirmed",
  "Contract signed",
  "Invoice submitted",
  "Payment made",
]

const statusStyles: Record<string, string> = {
  Issued: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Confirmed: "border-success bg-success-soft text-success",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  "Awaiting buyer signature": "border-warning bg-warning-soft text-warning",
  "Awaiting your signature": "border-warning bg-warning-soft text-warning",
  "Fully signed": "border-success bg-success-soft text-success",
  Draft: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Submitted: "border-accent-soft bg-accent-soft text-accent-strong",
  Approved: "border-success/60 bg-success-soft text-success",
  Paid: "border-success bg-success-soft text-success",
  Overdue: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

const fieldClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"

function formatCurrency(value: string | number | null | undefined): string {
  const amount = parseCurrencyToNumber(value)
  if (!amount) return "-"

  return `R ${Math.round(amount).toLocaleString("en-ZA")}`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function statusPill(label: string) {
  return (
    <span
      className={`inline-flex w-fit rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] ${
        statusStyles[label] ?? "border-panel bg-panel text-secondary"
      }`}
    >
      {label}
    </span>
  )
}

function poStatusLabel(status: string | null): string {
  const normalized = normalizePurchaseOrderStatus(status)
  if (normalized === "Accepted" || normalized === "Completed" || normalized === "Delivered") return "Confirmed"
  if (normalized === "Cancelled") return "Rejected"
  return "Issued"
}

function contractStatusLabel(contract: Contract | null, isSupplier: boolean): string {
  if (!contract) return "Awaiting buyer signature"
  const normalized = normalizeContractStatus(contract.status, contract.end_date)
  if (["Active", "Completed", "Renewed"].includes(normalized)) return "Fully signed"
  if (normalized === "Terminated") return "Expired"

  return isSupplier ? "Awaiting your signature" : "Awaiting buyer signature"
}

function invoiceStatusLabel(invoice: Invoice | null): string {
  if (!invoice) return "Draft"
  if (invoice.status === "Rejected") return "Draft"
  if (invoice.status === "Under Review") return "Submitted"
  if (invoice.status === "Paid") return "Paid"
  if (invoice.status === "Approved") return "Approved"

  const due = invoice.due_date ? new Date(invoice.due_date) : null
  if (invoice.status === "Submitted" && due && due.getTime() < Date.now()) return "Overdue"

  return invoice.status || "Draft"
}

function deriveCurrentStep(po: PurchaseOrder, contract: Contract | null, invoice: Invoice | null): number {
  const poStatus = poStatusLabel(po.status)
  const contractStatus = contractStatusLabel(contract, false)
  const invoiceStatus = invoiceStatusLabel(invoice)

  if (invoiceStatus === "Paid") return 6
  if (["Approved", "Submitted", "Overdue"].includes(invoiceStatus)) return 5
  if (contractStatus === "Fully signed") return 4
  if (poStatus === "Confirmed") return 3
  if (poStatus === "Issued") return 2

  return 1
}

function parseLineItems(po: PurchaseOrder) {
  const amount = parseCurrencyToNumber(po.amount)

  return [
    {
      description: po.title || po.rfq?.title || "Awarded goods or services",
      quantity: po.timeline || "1 lot",
      total: amount,
    },
  ]
}

function hasVatRegistration(po: PurchaseOrder | null): boolean {
  const supplier = po?.supplier

  return Boolean(
    supplier?.verification_status?.toLowerCase().includes("vat") ||
      supplier?.csd_number ||
      supplier?.bbbee_level,
  )
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-heading">{value || "-"}</p>
    </div>
  )
}

function DocumentHistory({ events }: { events: ActivityEvent[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-6 border-t border-panel pt-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">
            Document history
          </span>
          <span className="mt-1 block text-sm font-semibold text-heading">
            {events.length} recorded event{events.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="text-sm font-bold text-accent">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {events.length === 0 ? (
            <p className="rounded-md border border-panel bg-panel px-4 py-3 text-sm text-muted">
              No visible audit activity is available yet.
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-md border border-panel bg-panel px-4 py-3">
                <p className="text-sm font-semibold text-heading">{event.action}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(event.created_at)}
                  {event.actor_email ? ` - ${event.actor_email}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AwardWorkspacePage() {
  const params = useParams<{ id: string }>()
  const awardId = Number(params.id)

  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [history, setHistory] = useState<Record<string, ActivityEvent[]>>({})
  const [tab, setTab] = useState<AwardTab>("po")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showSignModal, setShowSignModal] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceDraft, setInvoiceDraft] = useState<InvoiceDraft>({
    invoiceNumber: "",
    invoiceDate: todayInputValue(),
    note: "",
    proofName: "",
    taxInvoiceName: "",
    amount: "",
  })

  const canManage = hasAdminOrBuyerAccess(profile)
  const isSupplier = !canManage

  const loadActivity = useCallback(async (entityType: string, entityId: number): Promise<ActivityEvent[]> => {
    if (!supabase) return []

    const { data, error } = await supabase
      .from("activity_logs")
      .select("id, action, created_at, actor_email, metadata")
      .eq("entity_type", entityType)
      .eq("entity_id", String(entityId))
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Award activity failed to load:", error)
      return []
    }

    return (data ?? []) as ActivityEvent[]
  }, [])

  const loadAward = useCallback(async () => {
    if (!Number.isFinite(awardId)) {
      setErrorMessage("Invalid award reference.")
      setLoading(false)
      return
    }

    try {
      const [currentProfile, loadedPo] = await Promise.all([
        getCurrentProfile(),
        getPurchaseOrderById(awardId),
      ])

      if (!loadedPo) {
        setProfile(currentProfile)
        setPo(null)
        setLoading(false)
        return
      }

      let loadedContract: Contract | null = null
      let loadedInvoice: Invoice | null = null

      if (supabase) {
        const { data: contractRef } = await supabase
          .from("contracts")
          .select("id")
          .eq("purchase_order_id", loadedPo.id)
          .maybeSingle()

        if (contractRef?.id) {
          loadedContract = await getContractById(contractRef.id as number)
        }

        const { data: invoiceRef } = await supabase
          .from("invoices")
          .select("id")
          .eq("purchase_order_id", loadedPo.id)
          .maybeSingle()

        if (invoiceRef?.id) {
          loadedInvoice = await getInvoiceById(invoiceRef.id as number)
        }
      }

      const poHistory = await getPurchaseOrderTimeline(loadedPo.id)
      const activityPromises = [
        loadedContract?.id ? loadActivity("contract", loadedContract.id) : Promise.resolve([]),
        loadedInvoice?.id ? loadActivity("invoice", loadedInvoice.id) : Promise.resolve([]),
      ]
      const [contractHistory, invoiceHistory] = await Promise.all(activityPromises)

      setProfile(currentProfile)
      setPo(loadedPo)
      setContract(loadedContract)
      setInvoice(loadedInvoice)
      setHistory({
        purchase_order: poHistory,
        contract: contractHistory,
        invoice: invoiceHistory,
      })
      setInvoiceDraft((current) => ({
        ...current,
        invoiceNumber:
          loadedInvoice?.invoice_number ||
          `${(loadedPo.supplier_name || "SUP").replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "SUP"}-${new Date().getFullYear()}-001`,
        amount: String(parseCurrencyToNumber(loadedInvoice?.amount ?? loadedPo.amount)),
      }))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Award workspace failed to load.")
    } finally {
      setLoading(false)
    }
  }, [awardId, loadActivity])

  useEffect(() => {
    loadAward()
  }, [loadAward])

  const lineItems = useMemo(() => (po ? parseLineItems(po) : []), [po])
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const vatRegistered = hasVatRegistration(po)
  const vat = vatRegistered ? subtotal * 0.15 : 0
  const total = subtotal + vat
  const poStatus = po ? poStatusLabel(po.status) : "Issued"
  const contractStatus = contractStatusLabel(contract, isSupplier)
  const invoiceStatus = invoiceStatusLabel(invoice)
  const currentStep = po ? deriveCurrentStep(po, contract, invoice) : 1
  const supplierScore = po?.supplier ? calculateSupplierSmartScore(po.supplier).score : null
  const awardTitle = po?.title || po?.rfq?.title || po?.po_number || "Award workspace"
  const buyerOrg = po?.rfq?.title ? "Procurement division" : "Buyer organisation"
  const hasPendingAction =
    (isSupplier && poStatus === "Issued") ||
    (isSupplier && contractStatus === "Awaiting your signature") ||
    (isSupplier && invoiceStatus === "Draft") ||
    (canManage && contractStatus === "Awaiting buyer signature") ||
    (canManage && invoiceStatus === "Submitted") ||
    (canManage && invoiceStatus === "Approved")

  async function refreshWithMessage(message: string) {
    setSuccessMessage(message)
    await loadAward()
  }

  async function confirmPo() {
    if (!po) return
    setUpdating(true)
    setErrorMessage("")
    try {
      await updatePurchaseOrderStatus(po.id, "Accepted")
      await refreshWithMessage("Purchase order receipt confirmed.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Purchase order update failed.")
    } finally {
      setUpdating(false)
    }
  }

  async function signContract() {
    if (!po) return
    setUpdating(true)
    setErrorMessage("")
    setShowSignModal(false)
    try {
      const targetContract = contract ?? await createContract({ purchaseOrderId: po.id })
      await updateContractStatus(targetContract.id, "Active")
      await refreshWithMessage("Contract digitally signed in the platform.")
      setTab("contract")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Contract signing failed.")
    } finally {
      setUpdating(false)
    }
  }

  async function submitInvoice(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!po) return

    if (!invoiceDraft.proofName) {
      setErrorMessage("Proof of delivery is required before submission.")
      return
    }

    setUpdating(true)
    setErrorMessage("")
    try {
      const targetInvoice = invoice ?? await createInvoice({
        contractId: contract?.id ?? null,
        purchaseOrderId: po.id,
        notes: invoiceDraft.note || null,
      })

      await updateInvoiceStatus(targetInvoice.id, "Submitted")
      await refreshWithMessage("Invoice submitted for buyer review.")
      setShowInvoiceForm(false)
      setTab("invoices")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invoice submission failed.")
    } finally {
      setUpdating(false)
    }
  }

  async function updateInvoice(status: "Approved" | "Rejected" | "Paid") {
    if (!invoice) return
    setUpdating(true)
    setErrorMessage("")
    try {
      await updateInvoiceStatus(invoice.id, status)
      await refreshWithMessage(`Invoice marked ${status}.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Invoice update failed.")
    } finally {
      setUpdating(false)
    }
  }

  function handleFile(field: "proofName" | "taxInvoiceName", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setInvoiceDraft((current) => ({ ...current, [field]: file?.name ?? "" }))
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  if (!po) {
    return (
      <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">Award workspace not found.</p>
        <p className="mt-2 text-xs text-muted">The linked purchase order may not exist or may not be available to this user.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Dashboard &gt; Contracts & orders &gt; {awardTitle}
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-heading">{awardTitle}</h1>
            <p className="mt-3 text-sm leading-7 text-secondary">
              {po.supplier_name || "Supplier"} - {buyerOrg} - Awarded {formatDate(po.generated_at)}
            </p>
          </div>
          <Link
            href={`/dashboard/messages?receiver_id=${po.supplier_id ?? ""}&rfq_id=${po.rfq_id ?? ""}&quote_id=${po.quote_id ?? ""}&subject=${encodeURIComponent(`Award ${po.po_number ?? po.id} discussion`)}`}
            className="inline-flex w-fit rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Messages
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["po", "Purchase order", poStatus],
            ["contract", "Contract", contractStatus],
            ["invoices", "Invoices", invoice ? "1" : "0"],
          ].map(([id, label, badge]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as AwardTab)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                tab === id
                  ? "border-accent bg-accent text-button"
                  : "border-panel bg-panel text-secondary hover:bg-surface"
              }`}
            >
              {label} <span className="ml-2 opacity-80">{badge}</span>
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">{errorMessage}</p>
        </div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-md border border-success bg-success-soft px-5 py-4">
          <p className="text-sm font-semibold text-success">{successMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-6 shadow-panel">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const complete = stepNumber < currentStep
            const current = stepNumber === currentStep

            return (
              <div key={step} className="relative text-center">
                <div
                  className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold ${
                    complete
                      ? "border-success bg-success text-button"
                      : current
                        ? "border-accent bg-accent text-button"
                        : "border-panel bg-panel text-muted"
                  }`}
                >
                  {complete ? "✓" : stepNumber}
                </div>
                <p className="mt-2 text-xs font-semibold text-secondary">{step}</p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-6">
          {tab === "po" && (
            <DocumentCard
              title={`Purchase Order ${po.po_number || `PO-${po.id}`}`}
              subtitle={`Issued ${formatDate(po.generated_at)} - ${buyerOrg} - Procurement division`}
              icon="PO"
              status={poStatus}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailField label="PO number" value={po.po_number || `PO-${po.id}`} />
                <DetailField label="Issue date" value={formatDate(po.generated_at)} />
                <DetailField label="Delivery date" value={formatDate(getEstimatedDeliveryDate(po.generated_at, po.timeline))} />
                <DetailField label="Payment terms" value="30 days from invoice" />
                <DetailField label="Delivery address" value={po.supplier?.province || po.rfq?.province || "South Africa"} />
                <DetailField label="Requisitioner" value={buyerOrg} />
                <DetailField label="Cost centre" value={po.rfq?.category || "Procurement"} />
                <DetailField label="Budget line" value={po.rfq?.budget ? formatCurrency(po.rfq.budget) : formatCurrency(po.amount)} />
              </div>
              <LineItemsTable items={lineItems} subtotal={subtotal} vat={vat} total={total} />
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => window.print()} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">Download PDF</button>
                <Link href={`/dashboard/quotes`} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">View original quote</Link>
                {isSupplier && poStatus === "Issued" && (
                  <>
                    <button type="button" disabled={updating} onClick={confirmPo} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button disabled:opacity-50">Confirm receipt</button>
                    <Link href={`/dashboard/messages?rfq_id=${po.rfq_id ?? ""}&subject=${encodeURIComponent(`Concern on ${po.po_number ?? `PO-${po.id}`}`)}`} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">Raise concern</Link>
                  </>
                )}
              </div>
              <DocumentHistory events={history.purchase_order ?? []} />
            </DocumentCard>
          )}

          {tab === "contract" && (
            <DocumentCard
              title={`Service agreement - ${po.title || po.rfq?.title || "Awarded services"}`}
              subtitle={`Contract ${contract?.contract_number || "pending"} - Issued ${formatDate(contract?.created_at ?? po.generated_at)}`}
              icon="CT"
              status={contractStatus}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailField label="Contract ref" value={contract?.contract_number || "Pending"} />
                <DetailField label="Contract type" value="Service agreement" />
                <DetailField label="Start date" value={formatDate(contract?.start_date ?? po.generated_at)} />
                <DetailField label="End date" value={formatDate(contract?.end_date ?? getEstimatedDeliveryDate(po.generated_at, po.timeline))} />
                <DetailField label="Contract value" value={formatCurrency(contract?.contract_value ?? po.amount)} />
                <DetailField label="Governing law" value="South Africa" />
                <DetailField label="Dispute forum" value="Buyer SCM escalation" />
                <DetailField label="BBBEE req met" value={po.supplier?.bbbee_level ? `✓ ${po.supplier.bbbee_level}` : "-"} />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SignaturePanel label="Buyer signature" signed={contractStatus === "Fully signed"} name={buyerOrg} timestamp={contract?.created_at ?? null} />
                <SignaturePanel label="Supplier signature" signed={contractStatus === "Fully signed"} name={po.supplier_name || "Supplier"} timestamp={contract?.created_at ?? null} />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {contractStatus === "Fully signed" && <button type="button" onClick={() => window.print()} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">Download signed contract</button>}
                <button type="button" className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">View full terms</button>
                {contractStatus !== "Fully signed" && (
                  <button type="button" onClick={() => setShowSignModal(true)} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">Sign contract</button>
                )}
              </div>
              <DocumentHistory events={history.contract ?? []} />
            </DocumentCard>
          )}

          {tab === "invoices" && (
            <DocumentCard
              title={`Invoice ${invoice?.invoice_number || invoiceDraft.invoiceNumber}`}
              subtitle={`Submitted ${formatDate(invoice?.created_at)} - Due ${formatDate(invoice?.due_date)} - 30 days from invoice`}
              icon="IN"
              status={invoiceStatus}
            >
              {invoice && (
                <div className="mb-5 rounded-md border border-panel bg-panel p-4">
                  <p className="text-sm font-semibold text-heading">{invoice.invoice_number || `INV-${invoice.id}`}</p>
                  <p className="mt-1 text-xs text-muted">{formatCurrency(invoice.total_amount ?? invoice.total ?? invoice.amount)} - {invoiceStatus}</p>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailField label="Invoice number" value={invoice?.invoice_number || invoiceDraft.invoiceNumber} />
                <DetailField label="Invoice date" value={formatDate(invoice?.created_at ?? invoiceDraft.invoiceDate)} />
                <DetailField label="Payment due" value={formatDate(invoice?.due_date)} />
                <DetailField label="PO reference" value={po.po_number || `PO-${po.id}`} />
              </div>
              <LineItemsTable items={lineItems} subtotal={subtotal} vat={vat} total={total} />
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => window.print()} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">Download invoice</button>
                <button type="button" className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">View proof of delivery</button>
                {canManage && invoiceStatus === "Submitted" && (
                  <>
                    <button type="button" disabled={updating} onClick={() => updateInvoice("Approved")} className="rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-button disabled:opacity-50">Approve invoice</button>
                    <button type="button" disabled={updating} onClick={() => updateInvoice("Rejected")} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary disabled:opacity-50">Request changes</button>
                    <button type="button" disabled={updating} onClick={() => updateInvoice("Rejected")} className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Raise dispute</button>
                  </>
                )}
                {canManage && invoiceStatus === "Approved" && (
                  <button type="button" disabled={updating} onClick={() => updateInvoice("Paid")} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button disabled:opacity-50">Record payment</button>
                )}
                {isSupplier && invoiceStatus === "Draft" && (
                  <button type="button" onClick={() => setShowInvoiceForm((current) => !current)} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">Submit invoice</button>
                )}
              </div>

              {showInvoiceForm && (
                <form onSubmit={submitInvoice} className="mt-6 rounded-md border border-warning bg-warning-soft p-5">
                  <h3 className="text-base font-semibold text-heading">Submit invoice</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">Invoice number</span>
                      <input value={invoiceDraft.invoiceNumber} onChange={(event) => setInvoiceDraft((current) => ({ ...current, invoiceNumber: event.target.value }))} className={fieldClass} />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">Invoice date</span>
                      <input type="date" value={invoiceDraft.invoiceDate} onChange={(event) => setInvoiceDraft((current) => ({ ...current, invoiceDate: event.target.value }))} className={fieldClass} />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">Proof of delivery</span>
                      <input type="file" onChange={(event) => handleFile("proofName", event)} className={fieldClass} />
                      {invoiceDraft.proofName && <span className="mt-1 block text-xs text-secondary">{invoiceDraft.proofName}</span>}
                    </label>
                    {vatRegistered && (
                      <label>
                        <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">Tax invoice</span>
                        <input type="file" onChange={(event) => handleFile("taxInvoiceName", event)} className={fieldClass} />
                      </label>
                    )}
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">Difference note</span>
                      <textarea value={invoiceDraft.note} onChange={(event) => setInvoiceDraft((current) => ({ ...current, note: event.target.value }))} rows={3} className={fieldClass} placeholder={`Invoice total differs from PO total (${formatCurrency(total)}). Add a note explaining the difference.`} />
                    </label>
                  </div>
                  <div className="mt-5 rounded-md border border-panel bg-card p-4 text-sm text-secondary">
                    Subtotal {formatCurrency(subtotal)} - VAT {formatCurrency(vat)} - Total {formatCurrency(total)}
                  </div>
                  <button type="submit" disabled={updating} className="mt-4 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button disabled:opacity-50">
                    {updating ? "Submitting..." : "Submit invoice"}
                  </button>
                </form>
              )}
              <DocumentHistory events={history.invoice ?? []} />
            </DocumentCard>
          )}
        </main>

        <aside className="space-y-6">
          <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Award summary</p>
            <h2 className="mt-2 text-lg font-semibold text-heading">{awardTitle}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="RFQ title" value={po.rfq?.title || po.title || "-"} href={po.rfq_id ? `/dashboard/rfqs/${po.rfq_id}` : undefined} />
              <SummaryRow label="Awarded to" value={po.supplier_name || "-"} />
              <SummaryRow label="Award date" value={formatDate(po.generated_at)} />
              <SummaryRow label="Contract value" value={formatCurrency(po.amount)} />
              <SummaryRow label="BBBEE level" value={po.supplier?.bbbee_level ? `✓ ${po.supplier.bbbee_level}` : "-"} />
              <SummaryRow label="SmartScore" value={supplierScore != null ? String(supplierScore) : "-"} />
            </div>
            <div className="mt-5 grid gap-2 border-t border-panel pt-4">
              <Link href="/dashboard/quotes" className="text-sm font-semibold text-accent">View original quote -&gt;</Link>
              {po.rfq_id && <Link href={`/dashboard/rfqs/${po.rfq_id}`} className="text-sm font-semibold text-accent">View RFQ -&gt;</Link>}
            </div>
          </section>

          <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-secondary">Workflow timeline</p>
            <div className="mt-4 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${index + 1 < currentStep ? "border-success bg-success text-button" : index + 1 === currentStep ? "border-accent bg-accent text-button" : "border-panel bg-panel text-muted"}`}>
                    {index + 1 < currentStep ? "✓" : index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-heading">{step}</p>
                    <p className="mt-1 text-xs text-muted">{index + 1 <= currentStep ? "Completed or in progress" : "Expected as lifecycle advances"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {hasPendingAction && (
            <section className="rounded-md border border-warning bg-warning-soft p-5 shadow-panel">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-warning">Action needed</p>
              <h2 className="mt-2 text-lg font-semibold text-heading">{actionTitle(isSupplier, poStatus, contractStatus, invoiceStatus)}</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">{actionDescription(isSupplier, poStatus, contractStatus, invoiceStatus)}</p>
              <div className="mt-5 grid gap-2">
                {isSupplier && poStatus === "Issued" && <button type="button" onClick={confirmPo} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">Confirm receipt</button>}
                {contractStatus !== "Fully signed" && <button type="button" onClick={() => { setTab("contract"); setShowSignModal(true) }} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">Sign contract</button>}
                {isSupplier && invoiceStatus === "Draft" && <button type="button" onClick={() => { setTab("invoices"); setShowInvoiceForm(true) }} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">Submit invoice</button>}
                {canManage && invoiceStatus === "Submitted" && <button type="button" onClick={() => updateInvoice("Approved")} className="rounded-md border border-success bg-success px-4 py-2 text-sm font-semibold text-button">Approve invoice</button>}
                {canManage && invoiceStatus === "Approved" && <button type="button" onClick={() => updateInvoice("Paid")} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button">Record payment</button>}
                <Link href={`/dashboard/messages?rfq_id=${po.rfq_id ?? ""}`} className="rounded-md border border-panel bg-card px-4 py-2 text-center text-sm font-semibold text-secondary">Request changes</Link>
              </div>
            </section>
          )}
        </aside>
      </div>

      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-md border border-panel bg-card p-6 shadow-panel">
            <h2 className="text-xl font-semibold text-heading">Confirm digital signature</h2>
            <p className="mt-3 text-sm leading-7 text-secondary">
              By clicking confirm, you are digitally signing this contract on behalf of {isSupplier ? po.supplier_name || "your company" : buyerOrg}. The platform records signer profile, timestamp, and browser session context through the existing audit trail.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setShowSignModal(false)} className="rounded-md border border-panel bg-panel px-4 py-2 text-sm font-semibold text-secondary">Cancel</button>
              <button type="button" disabled={updating} onClick={signContract} className="rounded-md border border-accent bg-accent px-4 py-2 text-sm font-semibold text-button disabled:opacity-50">
                {updating ? "Signing..." : "Confirm signature"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentCard({
  title,
  subtitle,
  icon,
  status,
  children,
}: {
  title: string
  subtitle: string
  icon: string
  status: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
      <div className="mb-6 flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-accent-soft bg-accent-soft text-xs font-bold text-accent-strong">
            {icon}
          </span>
          <div>
            <h2 className="text-xl font-semibold text-heading">{title}</h2>
            <p className="mt-1 text-sm text-secondary">{subtitle}</p>
          </div>
        </div>
        {statusPill(status)}
      </div>
      {children}
    </section>
  )
}

function LineItemsTable({
  items,
  subtotal,
  vat,
  total,
}: {
  items: { description: string; quantity: string; total: number }[]
  subtotal: number
  vat: number
  total: number
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-panel">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-panel">
          <tr>
            <th className="px-4 py-3 text-left text-[0.65rem] uppercase tracking-[0.2em] text-secondary">Description</th>
            <th className="px-4 py-3 text-right text-[0.65rem] uppercase tracking-[0.2em] text-secondary">Line total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-panel">
          {items.map((item) => (
            <tr key={item.description}>
              <td className="px-4 py-4 text-heading">
                <span className="font-semibold">{item.description}</span>
                <span className="ml-2 text-xs text-muted">({item.quantity})</span>
              </td>
              <td className="px-4 py-4 text-right font-semibold tabular-nums text-heading">{formatCurrency(item.total)}</td>
            </tr>
          ))}
          <tr><td className="px-4 py-3 text-right text-secondary">Subtotal</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-heading">{formatCurrency(subtotal)}</td></tr>
          {vat > 0 && <tr><td className="px-4 py-3 text-right text-secondary">VAT (15%)</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-heading">{formatCurrency(vat)}</td></tr>}
          <tr className="bg-panel"><td className="px-4 py-4 text-right text-base font-bold text-heading">Total</td><td className="px-4 py-4 text-right text-base font-bold tabular-nums text-heading">{formatCurrency(total)}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

function SignaturePanel({
  label,
  signed,
  name,
  timestamp,
}: {
  label: string
  signed: boolean
  name: string
  timestamp: string | null
}) {
  return (
    <div className="rounded-md border border-panel bg-panel p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">{label}</p>
      {signed ? (
        <p className="mt-3 text-sm font-semibold text-heading">{name} - {formatDate(timestamp)}</p>
      ) : (
        <p className="mt-3 text-sm font-semibold text-warning">Awaiting signature</p>
      )}
    </div>
  )
}

function SummaryRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-secondary">{label}</span>
      {href ? (
        <Link href={href} className="text-right font-semibold text-accent">{value}</Link>
      ) : (
        <span className="text-right font-semibold text-heading">{value}</span>
      )}
    </div>
  )
}

function actionTitle(isSupplier: boolean, poStatus: string, contractStatus: string, invoiceStatus: string): string {
  if (isSupplier && poStatus === "Issued") return "Confirm receipt of purchase order"
  if (contractStatus !== "Fully signed") return "Sign contract"
  if (isSupplier && invoiceStatus === "Draft") return "Submit invoice"
  if (!isSupplier && invoiceStatus === "Submitted") return "Approve invoice"
  if (!isSupplier && invoiceStatus === "Approved") return "Record payment"
  return "Review award"
}

function actionDescription(isSupplier: boolean, poStatus: string, contractStatus: string, invoiceStatus: string): string {
  if (isSupplier && poStatus === "Issued") return "The buyer has issued a purchase order. Confirm receipt before contracting and invoicing proceed."
  if (contractStatus !== "Fully signed") return "A platform signature is required before the award can move into invoice submission."
  if (isSupplier && invoiceStatus === "Draft") return "Work can be invoiced once proof of delivery and the invoice details are ready."
  if (!isSupplier && invoiceStatus === "Submitted") return "The supplier has submitted an invoice for review against the purchase order."
  if (!isSupplier && invoiceStatus === "Approved") return "Finance can record payment once the payment reference is available."
  return "Review the lifecycle documents and messages for this award."
}
