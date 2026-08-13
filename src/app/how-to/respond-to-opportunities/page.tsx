import type { Metadata } from "next"
import LongFormGuidePage from "@/components/LongFormGuidePage"

export const metadata: Metadata = {
  title: "How to Respond to Opportunities on AiForm Procure | Supplier Winning Guide",
  description: "Submit winning quotes in 8 steps: find opportunities, filter, read requirements, check qualification, prepare quote, submit response, track. Guide for suppliers responding to tenders.",
  alternates: { canonical: "/how-to/respond-to-opportunities" },
}

export default function RespondToOpportunitiesGuidePage() {
  return <LongFormGuidePage title="How to Respond to Opportunities on AiForm Procure" eyebrow="Supplier how-to guide" draftPath="src/app/guides/how-to-respond/CONTENT_DRAFT.md" canonicalPath="/how-to/respond-to-opportunities" schemaKind="HowTo" description={String(metadata.description)} />
}
