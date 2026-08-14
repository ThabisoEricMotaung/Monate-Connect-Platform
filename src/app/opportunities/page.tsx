import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import PublicBreadcrumbs from "@/components/PublicBreadcrumbs"
import { fetchPublicOpportunities } from "@/lib/publicOpportunities"
import OpportunitiesClient from "./OpportunitiesClient"

const SITE_URL = "https://www.aiformprocure.co.za"

// The closing_date filter is evaluated against the current request time, so
// this route must never be statically prerendered -- same reasoning as
// src/app/sitemap.ts, which hits the identical staleness risk.
export const dynamic = "force-dynamic"

export function generateMetadata(): Metadata {
  const title = "506 Live Tender Opportunities | Government & Private Procurement | South Africa"
  const description = "Browse 506 active government tenders and private RFQs. Filter by location, category, deadline. Verified opportunities with deadline alerts and compliance checklists."
  const url = `${SITE_URL}/opportunities`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: "Live Tender Opportunities & RFQs",
      description: "506 active government tenders and RFQs in South Africa. Filter and apply instantly.",
      url,
      siteName: "AiForm Procure",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function OpportunitiesPage() {
  const [initialRfqs, t] = await Promise.all([
    fetchPublicOpportunities(),
    getTranslations("publicChrome"),
  ])

  return (
    <OpportunitiesClient
      initialRfqs={initialRfqs}
      breadcrumbs={
        <PublicBreadcrumbs
          items={[
            { label: t("breadcrumbHome"), href: "/" },
            { label: t("opportunities"), href: "/opportunities" },
          ]}
        />
      }
    />
  )
}
