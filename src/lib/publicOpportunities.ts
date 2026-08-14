import { createClient } from "@supabase/supabase-js"

// Server-side fetch for the public opportunities list. Uses its own Supabase
// client (not the browser client from "@/lib/supabase") because this now runs
// in a server component -- same pattern already used by
// src/app/opportunities/[id]/page.tsx and src/app/sitemap.ts.

export type PublicRFQ = {
  id: number
  title: string | null
  description: string | null
  province?: string | null
  provinces?: string[] | null
  category?: string | null
  industry?: string | null
  budget?: string | number | null
  estimated_value_min?: number | null
  estimated_value_max?: number | null
  deadline?: string | null
  closing_date?: string | null
  status: string | null
  created_at?: string | null
  published_date?: string | null
  buyer_name?: string | null
  buyer?: string | null
  buyer_org?: string | null
  organization_name?: string | null
  bbbee_requirement?: string | null
  bbee_requirement?: string | null
  bbbee_level?: string | null
  is_external_opportunity?: boolean | null
  original_source_url?: string | null
  source_name?: string | null
  curation_status?: string | null
}

const PUBLIC_RFQ_COLUMNS =
  "id,title,description,buyer_name,buyer_org,industry,category,province,provinces,bbbee_requirement,estimated_value_min,estimated_value_max,closing_date,published_date,status,quote_count,is_external_opportunity,original_source_url,source_name,curation_status"

function supabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
}

export async function fetchPublicOpportunities(): Promise<PublicRFQ[]> {
  const supabase = supabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("rfqs")
    .select(PUBLIC_RFQ_COLUMNS)
    .ilike("status", "open")
    .gt("closing_date", new Date().toISOString())
    .eq("is_public", true)
    .or("is_external_opportunity.is.null,is_external_opportunity.eq.false,curation_status.eq.approved")
    .order("closing_date", { ascending: true, nullsFirst: false })

  if (error) {
    console.warn("Public opportunities fetch failed:", error.message)
    return []
  }
  return (data ?? []) as PublicRFQ[]
}
