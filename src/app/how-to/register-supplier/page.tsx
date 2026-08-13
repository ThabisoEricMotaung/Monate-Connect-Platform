import type { Metadata } from "next"
import LongFormGuidePage from "@/components/LongFormGuidePage"

export const metadata: Metadata = {
  title: "How to Register as a Supplier on AiForm Procure | Step-by-Step Guide",
  description: "Register as a supplier in 7 steps: create account, verify email, complete profile, upload CSD, SARS tax, banking, B-BBEE documents. Get SmartScore and be discovered by buyers.",
  alternates: { canonical: "/how-to/register-supplier" },
}

export default function RegisterSupplierGuidePage() {
  return <LongFormGuidePage title="How to Register as a Supplier on AiForm Procure" eyebrow="Supplier how-to guide" draftPath="src/app/guides/how-to-register/CONTENT_DRAFT.md" canonicalPath="/how-to/register-supplier" schemaKind="HowTo" description={String(metadata.description)} />
}
