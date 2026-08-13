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
  const title = "Open procurement opportunities in South Africa - AiForm Procure"
  const description =
    "Browse open public tenders and RFQs across South Africa by industry, province, and closing date. Free to join during the pilot."
  const url = `${SITE_URL}/opportunities`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
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
