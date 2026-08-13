import type { Metadata } from "next"
import LongFormGuidePage from "@/components/LongFormGuidePage"

export const metadata: Metadata = {
  title: "How to Post an RFQ on AiForm Procure | Buyer Guide",
  description: "Post an RFQ in 8 steps: create RFQ, add specs, set budget, add documents, compliance requirements, review, manage responses. Connect with verified suppliers instantly.",
  alternates: { canonical: "/how-to/post-rfq" },
}

export default function PostRfqGuidePage() {
  return <LongFormGuidePage title="How to Post an RFQ on AiForm Procure" eyebrow="Buyer how-to guide" draftPath="src/app/guides/how-to-post-rfq/CONTENT_DRAFT.md" canonicalPath="/how-to/post-rfq" schemaKind="HowTo" description={String(metadata.description)} />
}
