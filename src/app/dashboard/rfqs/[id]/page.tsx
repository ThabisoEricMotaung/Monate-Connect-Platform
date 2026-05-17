import { rfqs, type Rfq } from "@/data/rfqs"
import { notFound } from "next/navigation"
import { RfqDetailClient } from "./rfq-detail-client"

type RFQDetailPageProps = {
  params: Promise<{ id: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return rfqs.map((rfq) => ({
    id: String(rfq.id),
  }))
}

export default async function RFQDetailPage({
  params,
}: RFQDetailPageProps) {
  const { id } = await params

  const rfq: Rfq | undefined = rfqs.find(
    (item) => item.id === Number(id)
  )

  if (!rfq) {
    notFound()
  }

  return (
    <RfqDetailClient rfq={rfq} />
  )
}
