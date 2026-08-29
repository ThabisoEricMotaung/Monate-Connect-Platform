import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"

const SITE_URL = "https://www.aiformprocure.co.za"
const PUBLIC_ROUTES = [
  "",
  "/tenders",
  "/suppliers",
  "/trust",
  "/pricing",
  "/about",
  "/contact",
  "/guides",
  "/guides/pppfa",
  "/guides/bbbee",
  "/guides/cidb-grading",
  "/guides/coida-uif",
  "/guides/tax-compliance-status",
] as const

type SitemapOpportunity = {
  id: number
  published_date: string | null
  created_at: string | null
}

export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date()
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" || path === "/opportunities" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/opportunities" ? 0.9 : 0.7,
  }))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return staticEntries

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
  const { data, error } = await supabase
    .from("rfqs")
    .select("id,published_date,created_at")
    .eq("is_public", true)
    .eq("status", "active")
    .gt("closing_date", generatedAt.toISOString())
    .or("is_external_opportunity.is.null,is_external_opportunity.eq.false,curation_status.eq.approved")
    .order("id", { ascending: true })

  if (error) {
    console.warn("Opportunity sitemap query failed:", error.message)
    return staticEntries
  }

  const opportunityEntries: MetadataRoute.Sitemap = ((data ?? []) as SitemapOpportunity[]).map((opportunity) => ({
    url: `${SITE_URL}/tenders/${opportunity.id}`,
    lastModified: new Date(opportunity.published_date || opportunity.created_at || generatedAt),
    changeFrequency: "daily",
    priority: 0.8,
  }))

  return [...staticEntries, ...opportunityEntries]
}
