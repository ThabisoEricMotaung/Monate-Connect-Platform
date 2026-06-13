"use client"

import Link from "next/link"
import SignedDocumentLink from "@/components/SignedDocumentLink"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { getCurrentProfile, hasAdminOrBuyerAccess } from "@/lib/auth"
import {
  CONTRACT_STATUSES,
  getContractRenewalStatus,
  getContractById,
  normalizeContractStatus,
  renewContract,
  terminateContract,
  updateContractStatus,
  type Contract,
  type ContractRenewalStatus,
  type ContractStatus,
} from "@/lib/contracts"
import { createInvoice } from "@/lib/invoices"

const statusStyles: Record<string, string> = {
  Draft: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Active: "border-success bg-success-soft text-success",
  "Expiring Soon": "border-warning bg-warning-soft text-warning",
  Renewed: "border-accent-soft bg-accent-soft text-accent-strong",
  Completed: "border-success/60 bg-success-soft text-success",
  Terminated: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

const renewalStatusStyles: Record<ContractRenewalStatus, string> = {
  Expired: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  "Expiring Soon": "border-warning bg-warning-soft text-warning",
  "Renewal Due": "border-accent bg-accent-soft text-accent-strong",
  Active: "border-success bg-success-soft text-success",
}

function formatAmount(amount: string | null): string {
  if (!amount) return "-"
  const numericAmount = Number(amount.replace(/[^\d]/g, ""))
  return Number.isNaN(numericAmount)
    ? amount
    : `R${numericAmount.toLocaleString("en-ZA")}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function toDateInputValue(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().slice(0, 10)
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
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-heading">
        {value || "-"}
      </p>
    </div>
  )
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const contractId = Number(params.id)
  const [contract, setContract] = useState<Contract | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [renewalNotes, setRenewalNotes] = useState("")
  const [newEndDate, setNewEndDate] = useState("")
  const [newRenewalDate, setNewRenewalDate] = useState("")
  const [terminationNotes, setTerminationNotes] = useState("")

  useEffect(() => {
    async function loadContract() {
      if (!Number.isFinite(contractId)) {
        setErrorMessage("Invalid contract reference.")
        setLoading(false)
        return
      }

      try {
        const [profile, loadedContract] = await Promise.all([
          getCurrentProfile(),
          getContractById(contractId),
        ])

        setCanManage(hasAdminOrBuyerAccess(profile))
        setContract(loadedContract)
        setNewEndDate(toDateInputValue(loadedContract?.end_date ?? null))
        setNewRenewalDate(toDateInputValue(loadedContract?.renewal_date ?? null))
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Contract failed to load."
        )
      } finally {
        setLoading(false)
      }
    }

    loadContract()
  }, [contractId])

  const currentStatus = normalizeContractStatus(
    contract?.status ?? null
  )
  const renewalStatus = getContractRenewalStatus(
    contract?.end_date ?? null,
    contract?.renewal_date ?? null
  )
  const timeline = useMemo(() => {
    const currentIndex = CONTRACT_STATUSES.indexOf(currentStatus)

    return CONTRACT_STATUSES.map((status, index) => ({
      status,
      completed: index <= currentIndex,
      current: status === currentStatus,
    }))
  }, [currentStatus])

  async function updateStatus(status: ContractStatus) {
    if (!contract) return

    setUpdating(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const updatedContract = await updateContractStatus(contract.id, status)
      setContract((await getContractById(contract.id)) ?? updatedContract)
      setSuccessMessage(
        `${updatedContract.contract_number || "Contract"} updated to ${status}.`
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Contract update failed."
      )
    } finally {
      setUpdating(false)
    }
  }

  async function generateInvoiceFromContract() {
    if (!contract) return

    setGeneratingInvoice(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const invoice = await createInvoice({
        contractId: contract.id,
      })

      router.push(`/dashboard/invoices/${invoice.id}`)
    } catch (error) {
      console.error("Invoice generation failed:", error)
      setErrorMessage(
        error instanceof Error ? error.message : "Invoice generation failed."
      )
    } finally {
      setGeneratingInvoice(false)
    }
  }

  async function renewCurrentContract() {
    if (!contract) return

    setUpdating(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const updatedContract = await renewContract({
        contractId: contract.id,
        endDate: newEndDate,
        renewalDate: newRenewalDate,
        notes: renewalNotes,
      })
      const refreshedContract = (await getContractById(contract.id)) ?? updatedContract
      setContract(refreshedContract)
      setRenewalNotes("")
      setNewEndDate(toDateInputValue(refreshedContract.end_date))
      setNewRenewalDate(toDateInputValue(refreshedContract.renewal_date))
      setSuccessMessage(
        `${updatedContract.contract_number || "Contract"} renewed successfully.`
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Contract renewal failed."
      )
    } finally {
      setUpdating(false)
    }
  }

  async function terminateCurrentContract() {
    if (!contract) return

    setUpdating(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const updatedContract = await terminateContract({
        contractId: contract.id,
        notes: terminationNotes,
      })
      setContract((await getContractById(contract.id)) ?? updatedContract)
      setTerminationNotes("")
      setSuccessMessage(
        `${updatedContract.contract_number || "Contract"} terminated.`
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Contract termination failed."
      )
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-md border border-panel bg-card shadow-panel" />
  }

  if (errorMessage && !contract) {
    return (
      <div className="rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">Contract failed to load</p>
        <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
        <p className="text-sm font-semibold text-heading">Contract not found.</p>
      </div>
    )
  }

  const contractTitle =
    contract.purchaseOrder?.title ||
    contract.rfq?.title ||
    contract.contract_number ||
    "Contract"

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 border-b border-panel pb-6 lg:flex-row lg:items-start lg:justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-accent">
            Procurement / Contract
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-heading">
            {contract.contract_number || `CNT-${contract.id}`}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
            Review supplier obligations, purchase order context, renewal timing,
            and lifecycle status for this managed agreement.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/contracts"
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Back to Contracts
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong"
          >
            Print Contract
          </button>
          <button
            type="button"
            disabled={generatingInvoice}
            onClick={generateInvoiceFromContract}
            className="inline-flex items-center justify-center rounded-md border border-panel bg-panel px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface disabled:opacity-50"
          >
            {generatingInvoice ? "Generating Invoice..." : "Generate Invoice"}
          </button>
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

      <div className="print-document space-y-6">
        {renewalStatus !== "Active" && currentStatus !== "Completed" && currentStatus !== "Terminated" && (
          <div className={`rounded-md border px-5 py-4 ${renewalStatusStyles[renewalStatus]}`}>
            <p className="text-sm font-semibold">
              Renewal warning: {renewalStatus}
            </p>
            <p className="mt-1 text-xs">
              Review supplier continuity, renewal dates, and close-out actions before service continuity is affected.
            </p>
          </div>
        )}

        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <div className="flex flex-col gap-4 border-b border-panel pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Contract Summary
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {contractTitle}
              </h2>
            </div>
            <span className={`inline-flex w-fit rounded-md border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${statusStyles[currentStatus]}`}>
              {currentStatus}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <DetailField label="Contract Number" value={contract.contract_number || `CNT-${contract.id}`} />
            <DetailField label="Supplier" value={contract.supplier_name || "-"} />
            <DetailField label="Contract Value" value={formatAmount(contract.contract_value)} />
            <DetailField label="Start Date" value={formatDate(contract.start_date)} />
            <DetailField label="End Date" value={formatDate(contract.end_date)} />
            <DetailField label="Renewal Date" value={formatDate(contract.renewal_date)} />
            <DetailField label="Renewal Status" value={renewalStatus} />
            <DetailField label="Status" value={currentStatus} />
            <DetailField label="Notes" value={contract.notes || "No notes captured."} />
            <div className="rounded-md border border-panel bg-panel p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Document Link
              </p>
              {contract.document_url ? (
                <SignedDocumentLink value={contract.document_url} bucket="rfq-documents" className="mt-2 inline-flex text-sm font-semibold text-accent transition hover:text-accent-strong">
                  Open contract document
                </SignedDocumentLink>
              ) : (
                <p className="mt-2 text-sm font-semibold text-heading">-</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Supplier Details
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {contract.supplier?.business_name ||
                  contract.supplier_name ||
                  "Supplier"}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="Supplier ID" value={contract.supplier_id} />
              <DetailField label="Industry" value={contract.supplier?.industry ?? null} />
              <DetailField label="Province" value={contract.supplier?.province ?? null} />
              <DetailField label="Phone" value={contract.supplier?.phone ?? null} />
              <DetailField label="Email" value={contract.supplier?.email ?? null} />
              <DetailField label="Verification" value={contract.supplier?.verification_status ?? null} />
              <DetailField label="CSD Number" value={contract.supplier?.csd_number ?? null} />
              <DetailField label="B-BBEE Level" value={contract.supplier?.bbbee_level ?? null} />
            </div>
          </div>

          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                RFQ Reference
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {contract.rfq?.title || contract.purchaseOrder?.title || "RFQ Record"}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="RFQ ID" value={contract.rfq_id ? `RFQ-${contract.rfq_id}` : null} />
              <DetailField label="Category" value={contract.rfq?.category ?? null} />
              <DetailField label="Province" value={contract.rfq?.province ?? null} />
              <DetailField label="Budget" value={formatAmount(contract.rfq?.budget ?? null)} />
              <DetailField label="Deadline" value={formatDate(contract.rfq?.deadline ?? null)} />
              <DetailField label="RFQ Status" value={contract.rfq?.status ?? null} />
            </div>
          </div>

          <div className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <div className="border-b border-panel pb-5">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
                Purchase Order Reference
              </p>
              <h2 className="mt-2 text-xl font-semibold text-heading">
                {contract.purchaseOrder?.po_number ||
                  (contract.purchase_order_id
                    ? `PO-${contract.purchase_order_id}`
                    : "Purchase Order")}
              </h2>
            </div>
            <div className="mt-5 grid gap-3">
              <DetailField label="PO ID" value={contract.purchase_order_id ? `PO-${contract.purchase_order_id}` : null} />
              <DetailField label="PO Number" value={contract.purchaseOrder?.po_number ?? null} />
              <DetailField label="PO Status" value={contract.purchaseOrder?.status ?? null} />
              <DetailField label="PO Amount" value={formatAmount(contract.purchaseOrder?.amount ?? contract.contract_value)} />
              <DetailField label="PO Timeline" value={contract.purchaseOrder?.timeline ?? null} />
              {contract.purchase_order_id ? (
                <Link
                  href={`/dashboard/purchase-orders/${contract.purchase_order_id}`}
                  className="inline-flex w-fit rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong print:hidden"
                >
                  View Purchase Order
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
            Lifecycle Status
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading">
            Contract workflow
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {timeline.map((item) => (
              <div
                key={item.status}
                className={`rounded-md border p-4 ${
                  item.completed
                    ? "border-accent bg-accent-soft"
                    : "border-panel bg-panel"
                }`}
              >
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-secondary">
                  {item.current ? "Current status" : item.completed ? "Completed" : "Pending"}
                </p>
                <p className="mt-2 text-sm font-semibold text-heading">
                  {item.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {canManage && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2 print:hidden">
          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
              Renewal Notes
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Renew contract
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contract-new-end-date" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.22em] text-secondary">
                  New End Date
                </label>
                <input
                  id="contract-new-end-date"
                  type="date"
                  value={newEndDate}
                  onChange={(event) => setNewEndDate(event.target.value)}
                  className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <div>
                <label htmlFor="contract-new-renewal-date" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.22em] text-secondary">
                  New Renewal Date
                </label>
                <input
                  id="contract-new-renewal-date"
                  type="date"
                  value={newRenewalDate}
                  onChange={(event) => setNewRenewalDate(event.target.value)}
                  className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="contract-renewal-notes" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.22em] text-secondary">
                  Renewal Notes
                </label>
                <textarea
                  id="contract-renewal-notes"
                  value={renewalNotes}
                  onChange={(event) => setRenewalNotes(event.target.value)}
                  rows={4}
                  placeholder="Capture continuity risks, extension terms, supplier performance context, or renewal approvals."
                  className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={updating || !newEndDate || !newRenewalDate}
              onClick={renewCurrentContract}
              className="mt-4 rounded-md border border-accent bg-accent px-5 py-2.5 text-sm font-semibold text-button transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating ? "Updating..." : "Renew Contract"}
            </button>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
              Termination Control
            </p>
            <h2 className="mt-2 text-xl font-semibold text-heading">
              Terminate contract
            </h2>
            <div className="mt-5">
              <label htmlFor="contract-termination-notes" className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.22em] text-secondary">
                Termination Notes
              </label>
              <textarea
                id="contract-termination-notes"
                value={terminationNotes}
                onChange={(event) => setTerminationNotes(event.target.value)}
                rows={5}
                placeholder="Termination notes are required before the contract can be marked as terminated."
                className="w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent/30"
              />
            </div>
            <button
              type="button"
              disabled={updating || !terminationNotes.trim()}
              onClick={terminateCurrentContract}
              className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating ? "Updating..." : "Terminate Contract"}
            </button>
          </section>

          <section className="rounded-md border border-panel bg-card p-6 shadow-panel xl:col-span-2">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-secondary">
              Status Actions
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {CONTRACT_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updating || status === currentStatus}
                  onClick={() => updateStatus(status)}
                  className="rounded-md border border-panel bg-panel px-4 py-2.5 text-sm font-semibold text-secondary transition hover:border-accent hover:bg-surface disabled:opacity-50"
                >
                  Mark {status}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
