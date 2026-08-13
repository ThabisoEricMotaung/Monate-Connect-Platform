import React from "react"
import Link from "next/link"
import { groupChecklist } from "@/lib/complianceChecklist"
import type { ComplianceRequirement, RFQ, SupplierComplianceFit } from "@/lib/rfqCompliance"

type Props = {
  requirements: ComplianceRequirement[]
  supplierComplianceFit?: SupplierComplianceFit | null
  rfq: RFQ
}

function supplierStatusFor(
  item: ComplianceRequirement,
  fit: SupplierComplianceFit,
): "verified" | "missing" | "expired" | null {
  if (fit.documentsVerified.includes(item.label)) return "verified"
  if (fit.documentsExpired.includes(item.label)) return "expired"
  if (fit.documentsMissing.includes(item.label)) return "missing"
  return null
}

export default function OpportunityComplianceChecklist({
  requirements,
  supplierComplianceFit,
  rfq,
}: Props) {
  const grouped = groupChecklist(requirements)
  const compliancePercentage = supplierComplianceFit?.compliancePercentage ?? 0

  return (
    <div className="space-y-6" aria-label={`Compliance requirements for ${rfq.title ?? "this opportunity"}`}>
      {supplierComplianceFit && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">Your Compliance Readiness</p>
              <p className="text-3xl font-bold text-blue-600">{compliancePercentage}%</p>
            </div>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-blue-600">
              <span className="text-xl font-bold text-white">{compliancePercentage}%</span>
            </div>
          </div>

          {!supplierComplianceFit.isCompliantForRFQ && (
            <div className="mt-4 space-y-2 text-sm text-blue-800">
              {supplierComplianceFit.documentsMissing.length > 0 && (
                <p>Missing: {supplierComplianceFit.documentsMissing.join(", ")}</p>
              )}
              {supplierComplianceFit.documentsExpired.length > 0 && (
                <p>Expired: {supplierComplianceFit.documentsExpired.join(", ")}</p>
              )}
            </div>
          )}

          {!supplierComplianceFit.isCompliantForRFQ && (
            <Link
              href="/dashboard/profile?tab=documents"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Upload missing documents &rarr;
            </Link>
          )}
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.group} className="space-y-3">
          <h3 className="text-lg font-semibold text-heading">{group.label}</h3>
          <div className="space-y-2">
            {group.items.map((item) => {
              const supplierStatus = supplierComplianceFit
                ? supplierStatusFor(item as ComplianceRequirement, supplierComplianceFit)
                : null

              return (
                <div key={item.id} className="flex items-start gap-3 rounded-lg border border-panel p-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-heading">{item.label}</p>
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          item.status === "Required"
                            ? "bg-red-100 text-red-700"
                            : item.status === "Recommended"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                      {supplierStatus && (
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            supplierStatus === "verified"
                              ? "bg-green-100 text-green-700"
                              : supplierStatus === "expired"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {supplierStatus === "verified"
                            ? "Verified"
                            : supplierStatus === "expired"
                              ? "Expired"
                              : "Missing"}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-secondary">{item.helpText}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
