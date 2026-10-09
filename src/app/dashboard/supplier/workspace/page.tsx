"use client"

import { useEffect, useState } from "react"
import ThusoHandoff from "@/components/thuso/assistant/ThusoHandoff"
import { rfqIdFromSearch } from "@/lib/thuso/session"

/**
 * Legacy entry point for the supplier Thuso workspace. Accepts ?rfqId= and
 * the older ?rfq_id= and hands over to the shared Thuso panel.
 */
export default function SupplierWorkspacePage() {
  const [rfqId, setRfqId] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    setRfqId(rfqIdFromSearch(window.location.search))
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <ThusoHandoff
        ready={rfqId !== undefined}
        context={rfqId ? { type: "rfq", id: rfqId, label: `RFQ #${rfqId}` } : null}
        backHref={rfqId ? `/dashboard/rfqs/${rfqId}` : "/dashboard/rfqs"}
        backLabel={rfqId ? "View RFQ details" : "Browse RFQs"}
      />
    </div>
  )
}
