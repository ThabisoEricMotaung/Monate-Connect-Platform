"use client"

import { IconCheck, IconAlertCircle, IconClock } from "@tabler/icons-react"

interface Supplier {
  id: string
  name: string
  score: number
  maxScore: number
  status: "complete" | "pending" | "missing"
  missingDocs?: string[]
}

interface SupplierScoringCardProps {
  rfqId?: number
  suppliers?: Supplier[]
}

export default function SupplierScoringCard({ rfqId, suppliers }: SupplierScoringCardProps) {
  // Mock data - would come from real API
  const defaultSuppliers: Supplier[] = [
    {
      id: "1",
      name: "Bidvest Group",
      score: 7.8,
      maxScore: 10,
      status: "pending",
      missingDocs: ["Tax Clearance"],
    },
    {
      id: "2",
      name: "Eskom Supplier",
      score: 8.2,
      maxScore: 10,
      status: "complete",
    },
    {
      id: "3",
      name: "CoJ Contact",
      score: 6.5,
      maxScore: 10,
      status: "missing",
      missingDocs: ["BEE Certificate", "CIDB Grade"],
    },
  ]

  const supplierList = suppliers || defaultSuppliers

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <IconCheck className="h-4 w-4 text-emerald-600" stroke={2} />
      case "pending":
        return <IconClock className="h-4 w-4 text-amber-600" stroke={2} />
      case "missing":
        return <IconAlertCircle className="h-4 w-4 text-rose-600" stroke={2} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "border-emerald-200 bg-emerald-50"
      case "pending":
        return "border-amber-200 bg-amber-50"
      case "missing":
        return "border-rose-200 bg-rose-50"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete":
        return "Complete"
      case "pending":
        return "Pending Review"
      case "missing":
        return "Missing Docs"
    }
  }

  return (
    <div className="rounded-lg border border-[#e0e0db] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#1a3a2a]">Supplier Evaluation</p>
        <p className="text-xs text-[#999] mt-1">
          {supplierList.length} responses • {supplierList.filter((s) => s.status === "complete").length} complete
        </p>
      </div>

      <div className="space-y-3">
        {supplierList.map((supplier) => (
          <div
            key={supplier.id}
            className={`rounded-lg border p-4 ${getStatusColor(supplier.status)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                {getStatusIcon(supplier.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1a3a2a]">{supplier.name}</p>
                  <p className="text-xs text-[#999]">{getStatusLabel(supplier.status)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#1a3a2a]">
                  {supplier.score}
                  <span className="text-xs font-normal text-[#999]">/{supplier.maxScore}</span>
                </p>
              </div>
            </div>

            {/* Score Bar */}
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/50">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500"
                style={{ width: `${(supplier.score / supplier.maxScore) * 100}%` }}
              />
            </div>

            {/* Missing Docs Alert */}
            {supplier.missingDocs && supplier.missingDocs.length > 0 && (
              <div className="mt-3 text-xs">
                <p className="font-semibold text-[#1a3a2a] mb-1">Missing:</p>
                <ul className="space-y-0.5">
                  {supplier.missingDocs.map((doc) => (
                    <li key={doc} className="text-[#555555]">
                      • {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Decision Prompt */}
      <div className="mt-4 rounded-lg bg-[#f5f5f3] p-3">
        <p className="text-xs font-semibold text-[#1a3a2a]">Next Action</p>
        <p className="text-xs text-[#555555] mt-1">
          Review all suppliers, then route to Finance for final approval.
        </p>
      </div>
    </div>
  )
}
