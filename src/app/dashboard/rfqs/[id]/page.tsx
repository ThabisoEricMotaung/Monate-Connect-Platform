import { rfqs, type Rfq } from "@/data/rfqs"
import { notFound } from "next/navigation"
import { RfqDetailClient } from "./rfq-detail-client"

type RFQDetailPageProps = {
  params: { id: string }
}

export default function RFQDetailPage({
  params,
}: RFQDetailPageProps) {
  const rfq: Rfq | undefined = rfqs.find(
    (item) => item.id === Number(params.id)
  )

  if (!rfq) {
    notFound()
  }

  return (
    <RfqDetailClient rfq={rfq} />
  )
}
