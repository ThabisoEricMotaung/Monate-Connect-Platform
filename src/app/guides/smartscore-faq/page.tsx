import type { Metadata } from "next"
import LongFormGuidePage from "@/components/LongFormGuidePage"

export const metadata: Metadata = {
  title: "SmartScore FAQ | How It's Calculated & What It Means | AiForm Procure",
  description: "FAQ about SmartScore on AiForm: what it is, calculation, improvements, disputes, limitations. Learn if SmartScore is a credit score or regulatory certification.",
  alternates: { canonical: "/guides/smartscore-faq" },
}

export default function SmartScoreFaqPage() {
  return <LongFormGuidePage title="SmartScore FAQ" eyebrow="Procurement readiness" draftPath="src/app/guides/smartscore-faq/CONTENT_DRAFT.md" canonicalPath="/guides/smartscore-faq" schemaKind="FAQPage" description={String(metadata.description)} />
}
