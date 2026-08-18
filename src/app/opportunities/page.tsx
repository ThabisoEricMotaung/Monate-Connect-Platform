import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Live Tender Opportunities | AiForm Procure",
  description: "Browse live tender opportunities and RFQs across South Africa",
}

export default function OpportunitiesPage() {
  redirect("/tenders")
}
