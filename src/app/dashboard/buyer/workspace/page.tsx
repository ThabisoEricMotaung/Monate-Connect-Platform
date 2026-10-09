"use client"

import { useEffect, useState } from "react"
import ThusoHandoff from "@/components/thuso/assistant/ThusoHandoff"
import { rfqIdFromSearch } from "@/lib/thuso/session"

/**
 * Legacy entry point for the buyer Thuso workspace. Accepts ?rfqId= and the
 * older ?rfq_id= and hands over to the shared Thuso panel; the server only
 * discusses RFQs this buyer owns or that are public.
 */
export default function BuyerWorkspacePage() {
  const [rfqId, setRfqId] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    setRfqId(rfqIdFromSearch(window.location.search))
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <ThusoHandoff
        ready={rfqId !== undefined}
        context={rfqId ? { type: "rfq", id: rfqId, label: `RFQ #${rfqId}` } : null}
        backHref={rfqId ? `/dashboard/buyer/rfqs/${rfqId}` : "/dashboard/buyer/rfqs"}
        backLabel={rfqId ? "View RFQ details" : "View your RFQs"}
      />
    </div>
  )
}
