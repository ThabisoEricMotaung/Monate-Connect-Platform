import type { Metadata } from "next"
import LongFormGuidePage from "@/components/LongFormGuidePage"

export const metadata: Metadata = {
  title: "Verification & Compliance FAQ | What Does Verified Mean? | AiForm Procure",
  description: "FAQ about supplier verification on AiForm: what 'verified' means, 3 verification states, expiry dates, how to challenge verification. Learn the difference between Supplier Provided, Reviewed, and Confirmed.",
  alternates: { canonical: "/guides/verification-faq" },
}

export default function VerificationFaqPage() {
  return <LongFormGuidePage title="Verification & Compliance FAQ" eyebrow="Supplier verification" draftPath="src/app/guides/verification-faq/CONTENT_DRAFT.md" canonicalPath="/guides/verification-faq" schemaKind="FAQPage" description={String(metadata.description)} />
}
