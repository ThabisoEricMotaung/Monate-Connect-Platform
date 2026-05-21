import { getRFQById } from "@/lib/rfqs"
import RFQDetailClient from "./rfq-detail-client"

export default async function RFQDetailPage({
  params,
}: {
  params: { id: string }
}) {

  const rfq = await getRFQById(params.id)

  if (!rfq) {
    return (
      <div className="text-heading">
        RFQ not found
      </div>
    )
  }

  return <RFQDetailClient rfq={rfq} />
}