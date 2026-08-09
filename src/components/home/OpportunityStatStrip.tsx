import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase-server"

async function getOpenOpportunityCount(): Promise<number | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { count, error } = await supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .ilike("status", "open")
      .gt("closing_date", new Date().toISOString())
      .eq("is_public", true)
      .or("is_external_opportunity.is.null,is_external_opportunity.eq.false,curation_status.eq.approved")

    if (error) {
      console.warn("Opportunity stat count failed:", error.message)
      return null
    }
    return count ?? null
  } catch (err) {
    console.warn("Opportunity stat count failed:", err)
    return null
  }
}

export default async function OpportunityStatStrip() {
  const count = await getOpenOpportunityCount()

  if (count === null) return null

  return (
    <div style={{ background: "#faf7f2", borderTop: "1px solid #e8e0cc", borderBottom: "1px solid #e8e0cc" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "22px 24px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          textAlign: "center",
        }}
      >
        <span
          className="font-display"
          style={{ fontSize: 30, fontWeight: 800, color: "#1a3a2a", lineHeight: 1 }}
        >
          {count.toLocaleString("en-ZA")}+
        </span>
        <span style={{ fontSize: 13, lineHeight: 1.5, color: "#5a6a5a", maxWidth: 460 }}>
          open opportunities aggregated from official government eTenders, updated daily —{" "}
          <Link href="/opportunities" className="font-bold text-accent hover:text-accent-strong">
            browse the live feed →
          </Link>
        </span>
      </div>
    </div>
  )
}
