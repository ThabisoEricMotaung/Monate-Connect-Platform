import { getPublicOpportunityStats } from "@/lib/publicOpportunityStats"

export async function GET() {
  const stats = await getPublicOpportunityStats()

  if (!stats) {
    return Response.json({ error: "Opportunity stats are unavailable." }, { status: 503 })
  }

  return Response.json(stats, {
    headers: { "Cache-Control": "no-store" },
  })
}
