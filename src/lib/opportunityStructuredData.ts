import {
  getOpportunityReference,
  getProcurementTypeLabel,
} from "@/lib/externalOpportunity"

const SITE_URL = "https://www.aiformprocure.co.za"

export type OpportunityStructuredDataInput = {
  id: number
  title?: string | null
  description?: string | null
  external_reference?: string | null
  is_external_opportunity?: boolean | null
  source_name?: string | null
  buyer_org?: string | null
  buyer_name?: string | null
  provinces?: string[] | null
  published_date?: string | null
  closing_date?: string | null
  budget?: string | number | null
  estimated_value_min?: number | null
  estimated_value_max?: number | null
  bbbee_requirement?: string | null
}

function estimatedValue(rfq: OpportunityStructuredDataInput): string | number | null {
  if (rfq.budget) return rfq.budget

  const minimum = rfq.estimated_value_min
  const maximum = rfq.estimated_value_max
  if (minimum == null && maximum == null) return null

  return `${minimum ?? ""}–${maximum ?? ""}`
}

export function buildOpportunityJsonLd(
  rfq: OpportunityStructuredDataInput,
  locale: string,
): object {
  void locale

  return {
    "@context": "https://schema.org",
    "@type": rfq.is_external_opportunity ? "GovernmentService" : "Service",
    name: rfq.title,
    description: rfq.description,
    url: `${SITE_URL}/tenders/${rfq.id}`,
    identifier: getOpportunityReference(rfq),
    provider: {
      "@type": "Organization",
      name: rfq.buyer_org || rfq.buyer_name || "Government Buyer",
    },
    areaServed: rfq.provinces?.length
      ? rfq.provinces.map((province) => ({
          "@type": "AdministrativeArea",
          name: province,
        }))
      : { "@type": "Country", name: "ZA" },
    datePosted: rfq.published_date,
    additionalProperty: [
      { name: "Closing Date", value: rfq.closing_date ?? null },
      { name: "Estimated Value", value: estimatedValue(rfq) },
      { name: "B-BBEE Requirement", value: rfq.bbbee_requirement ?? null },
      { name: "Procurement Type", value: getProcurementTypeLabel(rfq) },
    ],
  }
}

export function buildOpportunitySearchActionJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AiForm Procure",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/tenders?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}
